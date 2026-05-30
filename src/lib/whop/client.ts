import {
  WHOP_API_BASE,
  getWhopApiKey,
  getWhopPlatformCompanyId,
} from "@/lib/whop/config"

// Thin Whop REST client for the connected-accounts model. All Whop HTTP lives
// here so endpoint/field names can be corrected in one place (see config.ts
// note on verifying against current docs).

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

// --- Developer connected accounts ---------------------------------------

// Create a connected company under the platform parent. Returns the company id.
export async function createConnectedCompany(input: {
  email: string
  title: string
}): Promise<string> {
  const company = await whopFetch<{ id: string }>("/api/v2/companies", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      title: input.title,
      parent_company_id: getWhopPlatformCompanyId(),
    }),
  })

  if (!company?.id) throw new Error("Whop company creation returned no id")
  return company.id
}

// Create a hosted account link (KYC onboarding or the payout portal) for a
// connected company. Returns the URL to redirect the developer to.
export async function createAccountLink(input: {
  companyId: string
  useCase: "account_onboarding" | "payouts_portal"
  returnUrl: string
  refreshUrl: string
}): Promise<string> {
  const link = await whopFetch<{ url: string }>("/api/v2/account_links", {
    method: "POST",
    body: JSON.stringify({
      company_id: input.companyId,
      use_case: input.useCase,
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
    }),
  })

  if (!link?.url) throw new Error("Whop account link returned no url")
  return link.url
}

// Whether a connected company has finished onboarding and can take payments /
// receive payouts. Used to flip whop_kyc_complete once a developer returns from
// the hosted KYC flow.
// VERIFY field names against current Whop docs (charges/payouts enabled flags).
export async function isConnectedCompanyReady(companyId: string): Promise<boolean> {
  const company = await whopFetch<{
    charges_enabled?: boolean
    payouts_enabled?: boolean
    kyc_status?: string
    status?: string
  }>(`/api/v2/companies/${companyId}`, { method: "GET" })

  return Boolean(
    company.charges_enabled ??
      company.payouts_enabled ??
      (company.kyc_status === "approved" || company.status === "active")
  )
}

// --- Asset products + checkout ------------------------------------------

// Create a product on the developer's connected company. Returns product id.
export async function createProductOnConnectedCompany(input: {
  companyId: string
  title: string
  description: string
}): Promise<string> {
  const product = await whopFetch<{ id: string }>("/api/v2/products", {
    method: "POST",
    body: JSON.stringify({
      company_id: input.companyId,
      title: input.title,
      description: input.description,
    }),
  })

  if (!product?.id) throw new Error("Whop product creation returned no id")
  return product.id
}

// Create a one-time plan on the connected company. application_fee_amount is
// the platform's cut (Whop routes the remainder to the developer's balance).
// Whop prices in major units, so convert from cents. Returns the plan id.
export async function createPlanOnConnectedCompany(input: {
  companyId: string
  productId: string
  priceCents: number
  applicationFeeCents: number
  title: string
}): Promise<string> {
  const plan = await whopFetch<{ id: string }>("/api/v2/plans", {
    method: "POST",
    body: JSON.stringify({
      company_id: input.companyId,
      product_id: input.productId,
      plan_type: "one_time",
      base_currency: "usd",
      initial_price: input.priceCents / 100,
      application_fee_amount: input.applicationFeeCents / 100,
      title: input.title.slice(0, 30), // Whop caps plan titles at 30 chars
    }),
  })

  if (!plan?.id) throw new Error("Whop plan creation returned no id")
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
