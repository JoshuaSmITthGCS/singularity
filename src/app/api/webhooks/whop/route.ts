import { createAdminClient } from "@/lib/supabase/admin"
import { fulfillProcurement } from "@/lib/procurements/fulfill"
import {
  isPaymentSuccess,
  readWhopSignature,
  verifyWhopSignature,
  type WhopWebhookEvent,
} from "@/lib/whop/webhook"

// Whop calls this when a checkout completes. We verify the signature, map the
// payment back to its procurement (via metadata.procurement_id), then deliver.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = readWhopSignature(request.headers)

  if (!verifyWhopSignature(rawBody, signature)) {
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

  const { error: markPaidError } = await admin
    .from("procurements")
    .update({ status: "paid", whop_payment_id: whopPaymentId })
    .eq("id", procurement.id)

  // 23505 = unique_violation: this payment id is already attached to a
  // *different* procurement row (idx_procurements_whop_payment_id_unique).
  // That should only happen from a Whop-side anomaly, not a normal retry —
  // don't deliver against a payment attribution we can't trust. Acknowledge
  // with 200 so Whop stops retrying; this procurement needs manual review.
  if (markPaidError?.code === "23505") {
    console.error(`Whop payment ${whopPaymentId} already attached to a different procurement`)
    return new Response("payment already attributed elsewhere", { status: 200 })
  }

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
