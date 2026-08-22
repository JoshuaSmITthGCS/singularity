import { createAdminClient } from "@/lib/supabase/admin"
import { fulfillProcurement } from "@/lib/procurements/fulfill"
import {
  isPaymentSuccess,
  readWhopWebhookHeaders,
  verifyWhopSignature,
  type WhopWebhookEvent,
} from "@/lib/whop/webhook"

// Whop calls this when a checkout completes. We verify the signature, map the
// payment back to its procurement (via metadata.procurement_id), then deliver.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const headers = readWhopWebhookHeaders(request.headers)

  if (!verifyWhopSignature(rawBody, headers)) {
    return new Response("Invalid signature", { status: 401 })
  }

  let event: WhopWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response("Invalid payload", { status: 400 })
  }

  // Always 200 on events we don't act on so Whop stops retrying.
  if (!isPaymentSuccess(event)) {
    return new Response("ignored", { status: 200 })
  }

  const procurementId = event.data?.metadata?.procurement_id
  const whopPaymentId = event.data?.id ?? null

  if (!procurementId) {
    return new Response("missing procurement_id", { status: 200 })
  }

  const admin = createAdminClient()

  const { data: procurement } = await admin
    .from("procurements")
    .select("*")
    .eq("id", procurementId)
    .single()

  if (!procurement) {
    return new Response("unknown procurement", { status: 200 })
  }

  // Idempotent: if already delivered, acknowledge and stop.
  if (procurement.status === "delivered") {
    return new Response("already delivered", { status: 200 })
  }

  const [{ data: asset }, { data: variant }] = await Promise.all([
    admin.from("assets").select("*").eq("id", procurement.asset_id).single(),
    admin.from("asset_variants").select("*").eq("id", procurement.variant_id).single(),
  ])

  if (!asset || !variant) {
    return new Response("missing asset or variant", { status: 200 })
  }

  await admin
    .from("procurements")
    .update({ status: "paid", whop_payment_id: whopPaymentId })
    .eq("id", procurement.id)

  const { data: clientProfile } = await admin
    .from("profiles")
    .select("github_installation_id")
    .eq("id", procurement.client_id)
    .single()

  await fulfillProcurement({
    admin,
    procurement: { ...procurement, status: "paid", whop_payment_id: whopPaymentId },
    asset,
    variant,
    clientInstallationId: clientProfile?.github_installation_id ?? null,
  })

  return new Response("ok", { status: 200 })
}
