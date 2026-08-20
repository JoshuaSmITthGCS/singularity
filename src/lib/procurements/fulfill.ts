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
  // T1.3: atomic claim, not check-then-act. Two concurrent invocations (a
  // Whop webhook retry racing the original delivery) can both read
  // status='paid' before either writes anything — a plain "if not delivered,
  // update to delivering" is a classic TOCTOU that would open two PRs and
  // insert two payment rows for one sale. A single conditional UPDATE lets
  // only one caller flip the status; the loser gets zero rows back and exits
  // as a no-op, regardless of which process reads first.
  const { data: claimed, error: claimError } = await admin
    .from("procurements")
    .update({ status: "delivering" })
    .eq("id", procurement.id)
    .in("status", ["awaiting_payment", "paid"])
    .select("*")
    .maybeSingle()

  if (claimError || !claimed) {
    // Already delivered, already being delivered by the winner of a
    // concurrent race, or in a terminal state — idempotent no-op.
    return procurement
  }

  try {
    const delivery = await deliverProcurement({
      procurementId: claimed.id,
      clientInstallationId,
      asset,
      variant,
      deliveryMethod: claimed.delivery_method,
      targetRepoFullName: claimed.target_repo_full_name,
      targetRepoBranch: claimed.target_repo_branch,
    })

    const { data: delivered, error: deliveredError } = await admin
      .from("procurements")
      .update({
        status: "delivered",
        pr_url: delivery.prUrl,
        pr_number: delivery.prNumber,
      })
      .eq("id", claimed.id)
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
        procurement_id: claimed.id,
        developer_id: asset.developer_id,
        amount_cents: claimed.developer_share_cents,
        status: "paid",
        paid_at: new Date().toISOString(),
      }),
      admin
        .from("profiles")
        .update({
          total_earnings_cents:
            Number(developerProfile?.total_earnings_cents ?? 0) + claimed.developer_share_cents,
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
    // NOTE: this lands in a genuinely terminal 'failed' state with no retry
    // path today. T3.3 (stuck-procurement recovery) would set this to 'paid'
    // + failure_reason instead so a "Retry delivery" action is meaningful —
    // don't make that change here without also shipping the retry affordance,
    // or a failed delivery silently becomes an unexplained "Pending" forever.
    const { data: failed } = await admin
      .from("procurements")
      .update({ status: "failed", failure_reason: message })
      .eq("id", claimed.id)
      .select("*")
      .single()

    return (failed as Procurement) ?? claimed
  }
}
