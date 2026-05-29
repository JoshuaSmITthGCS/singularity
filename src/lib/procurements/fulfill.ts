import { deliverProcurement } from "@/lib/procurements/delivery"
import type { createAdminClient } from "@/lib/supabase/admin"
import type { Asset, AssetVariant, Procurement } from "@/types/database"

type AdminClient = ReturnType<typeof createAdminClient>

// Run delivery for a paid procurement and record the developer ledger entry.
//
// Under the connected-accounts model Whop has already routed the developer's
// share to their connected balance (the platform took its application fee), so
// the payment row is recorded as `paid`. The developer withdraws via Whop's
// hosted payout portal. total_earnings_cents tracks lifetime earnings.
export async function fulfillProcurement({
  admin,
  procurement,
  asset,
  variant,
  clientInstallationId,
}: {
  admin: AdminClient
  procurement: Procurement
  asset: Asset
  variant: AssetVariant
  clientInstallationId: number | null
}): Promise<Procurement> {
  // Idempotency: a webhook can fire more than once. Never deliver twice.
  if (procurement.status === "delivered") return procurement

  await admin.from("procurements").update({ status: "delivering" }).eq("id", procurement.id)

  try {
    const delivery = await deliverProcurement({
      procurementId: procurement.id,
      clientInstallationId,
      asset,
      variant,
      deliveryMethod: procurement.delivery_method,
      targetRepoFullName: procurement.target_repo_full_name,
      targetRepoBranch: procurement.target_repo_branch,
    })

    const { data: delivered, error: deliveredError } = await admin
      .from("procurements")
      .update({
        status: "delivered",
        pr_url: delivery.prUrl,
        pr_number: delivery.prNumber,
      })
      .eq("id", procurement.id)
      .select("*")
      .single()

    if (deliveredError) throw deliveredError

    const { data: developerProfile } = await admin
      .from("profiles")
      .select("total_earnings_cents")
      .eq("id", asset.developer_id)
      .single()

    await Promise.all([
      admin.from("payments").insert({
        procurement_id: procurement.id,
        developer_id: asset.developer_id,
        amount_cents: procurement.developer_share_cents,
        status: "paid",
        paid_at: new Date().toISOString(),
      }),
      admin
        .from("profiles")
        .update({
          total_earnings_cents:
            Number(developerProfile?.total_earnings_cents ?? 0) + procurement.developer_share_cents,
        })
        .eq("id", asset.developer_id),
      admin
        .from("assets")
        .update({ procurement_count: asset.procurement_count + 1 })
        .eq("id", asset.id),
    ])

    return delivered as Procurement
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery failed"
    const { data: failed } = await admin
      .from("procurements")
      .update({ status: "failed", failure_reason: message })
      .eq("id", procurement.id)
      .select("*")
      .single()

    return failed as Procurement
  }
}
