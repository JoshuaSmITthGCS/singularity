import { WHOP_API_BASE, getWhopApiKey, getWhopProductId } from "@/lib/whop/config"

// Thin Whop REST client. All Whop HTTP lives here so endpoint/field names can be
// corrected in one place (see config.ts note on verifying against current docs).

async function whopFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${WHOP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getWhopApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Payments must never be served from a cache.
    cache: "no-store",
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message = json?.error?.message || json?.message || `Whop request failed (${response.status})`
    throw new Error(message)
  }

  return json as T
}

// Create a one-time plan priced to match the asset. Returns the Whop plan id.
// Whop plans are priced in major units (dollars), so convert from cents.
export async function createPlanForAsset(input: {
  assetId: string
  title: string
  priceCents: number
}): Promise<string> {
  const plan = await whopFetch<{ id: string }>("/api/v2/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id: getWhopProductId(),
      plan_type: "one_time",
      base_currency: "usd",
      initial_price: input.priceCents / 100,
      internal_notes: `Singularity asset ${input.assetId}: ${input.title}`,
    }),
  })

  if (!plan?.id) {
    throw new Error("Whop plan creation returned no id")
  }

  return plan.id
}

// Create a hosted checkout session for a plan. metadata is echoed back to the
// webhook so we can map a completed payment to its procurement.
export async function createCheckoutSession(input: {
  planId: string
  redirectUrl: string
  metadata: Record<string, string>
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const session = await whopFetch<{
    id: string
    purchase_url?: string
    checkout_url?: string
    url?: string
  }>("/api/v2/checkout_sessions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: input.planId,
      redirect_url: input.redirectUrl,
      metadata: input.metadata,
    }),
  })

  const checkoutUrl = session.purchase_url || session.checkout_url || session.url

  if (!session?.id || !checkoutUrl) {
    throw new Error("Whop checkout session did not include a redirect URL")
  }

  return { checkoutId: session.id, checkoutUrl }
}
