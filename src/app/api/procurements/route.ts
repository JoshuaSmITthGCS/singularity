import { dataResponse, errorResponse } from "@/lib/api"
import { calculateShares, buildDownloadPayload } from "@/lib/procurements/delivery"
import { demoAssets, demoProcurements, getDemoAsset, getDemoVariant } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createProcurementSchema } from "@/lib/validation"
import { installationHasRepo } from "@/lib/github/octokit"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"
import {
  createCheckoutSession,
  createPlanOnConnectedCompany,
  createProductOnConnectedCompany,
} from "@/lib/whop/client"
import { getAppUrl } from "@/lib/env"

const PROCUREMENT_LIMIT = 20
const PROCUREMENT_WINDOW_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  if (isDemoMode()) {
    const rateLimit = await checkRateLimit({
      key: `procurements:ip:${getClientIp(request)}`,
      limit: PROCUREMENT_LIMIT,
      windowMs: PROCUREMENT_WINDOW_MS,
    })
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

    const body = await request.json().catch(() => null)
    const parsed = createProcurementSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Procurement payload is invalid", 400)
    }

    const asset = getDemoAsset(parsed.data.asset_id) ?? demoAssets[0]
    const variant = getDemoVariant(parsed.data.variant_id)

    if (!variant || variant.status !== "passed") {
      return errorResponse("Choose a verified target", 400)
    }

    return dataResponse({
      procurement: {
        ...demoProcurements[0],
        id: "30000000-0000-4000-8000-000000000099",
        asset_id: asset.id,
        variant_id: variant.id,
        target_language: variant.target_language,
        delivery_method: parsed.data.delivery_method,
        target_repo_full_name: parsed.data.target_repo_full_name ?? null,
        target_repo_branch: parsed.data.target_repo_branch ?? "main",
        pr_url:
          parsed.data.delivery_method === "github_pr"
            ? "https://github.com/studio/prototype-platformer/pull/42"
            : null,
        status: "delivered",
      },
      download_payload:
        parsed.data.delivery_method === "download" ? buildDownloadPayload(asset, variant) : null,
    })
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const rateLimit = await checkRateLimit({
    key: `procurements:user:${user.id}`,
    limit: PROCUREMENT_LIMIT,
    windowMs: PROCUREMENT_WINDOW_MS,
  })
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  const body = await request.json().catch(() => null)
  const parsed = createProcurementSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Procurement payload is invalid", 400)
  }

  const input = parsed.data
  const [{ data: asset, error: assetError }, { data: variant, error: variantError }] =
    await Promise.all([
      admin.from("assets").select("*").eq("id", input.asset_id).single(),
      admin.from("asset_variants").select("*").eq("id", input.variant_id).single(),
    ])

  if (assetError || !asset) return errorResponse("Asset not found", 404)
  if (variantError || !variant) return errorResponse("Variant not found", 404)
  if (variant.asset_id !== asset.id) return errorResponse("Variant does not belong to asset", 400)
  if (variant.status !== "passed") return errorResponse("Choose a verified target", 400)
  if (asset.developer_id === user.id) return errorResponse("Use another account to buy your own asset", 400)

  const [{ data: profile, error: profileError }, { data: developer, error: developerError }] =
    await Promise.all([
      admin.from("profiles").select("github_installation_id").eq("id", user.id).single(),
      admin
        .from("profiles")
        .select("whop_company_id, whop_kyc_complete")
        .eq("id", asset.developer_id)
        .single(),
    ])

  if (profileError) return errorResponse("Profile is not ready", 400)
  if (developerError || !developer) return errorResponse("Developer profile is not ready", 400)

  // The developer must have a connected Whop account so payment can be split to
  // their balance. They onboard via /api/whop/connect before publishing.
  if (!developer.whop_company_id || !developer.whop_kyc_complete) {
    return errorResponse("This developer has not finished payment onboarding yet", 409)
  }

  if (input.delivery_method === "github_pr") {
    if (!input.target_repo_full_name) return errorResponse("Choose a target repo", 400)
    if (!profile.github_installation_id) return errorResponse("Install the GitHub App first", 400)

    const hasRepo = await installationHasRepo(profile.github_installation_id, input.target_repo_full_name)
    if (!hasRepo) return errorResponse("Install the GitHub App on that repo", 400)
  }

  const { developerShareCents, platformFeeCents, referralReserveCents } = calculateShares(asset.price_cents)
  // Whop routes the developer share to their connected balance automatically;
  // the platform takes its cut (fee + referral reserve) as the application fee.
  const applicationFeeCents = platformFeeCents + referralReserveCents

  // Create the procurement up front in awaiting_payment. Delivery happens only
  // after Whop confirms payment via the webhook (see /api/webhooks/whop).
  const { data: procurement, error: procurementError } = await admin
    .from("procurements")
    .insert({
      client_id: user.id,
      asset_id: asset.id,
      variant_id: variant.id,
      developer_id: asset.developer_id,
      target_language: variant.target_language,
      delivery_method: input.delivery_method,
      target_repo_full_name: input.target_repo_full_name || null,
      target_repo_branch: input.target_repo_branch || "main",
      price_cents: asset.price_cents,
      developer_share_cents: developerShareCents,
      platform_fee_cents: platformFeeCents,
      referral_reserve_cents: referralReserveCents,
      status: "awaiting_payment",
    })
    .select("*")
    .single()

  if (procurementError) return errorResponse(procurementError.message, 400)

  try {
    // Each asset maps to a product + plan on the developer's connected company,
    // created lazily on first purchase and cached on the asset. The plan carries
    // the platform's application fee, so Whop splits every payment automatically.
    let planId = asset.whop_plan_id
    if (!planId) {
      const productId =
        asset.whop_product_id ??
        (await createProductOnConnectedCompany({
          companyId: developer.whop_company_id,
          title: asset.title,
          description: asset.short_description,
        }))

      planId = await createPlanOnConnectedCompany({
        companyId: developer.whop_company_id,
        productId,
        priceCents: asset.price_cents,
        applicationFeeCents,
        title: asset.title,
      })

      await admin
        .from("assets")
        .update({ whop_product_id: productId, whop_plan_id: planId })
        .eq("id", asset.id)
    }

    const { checkoutId, checkoutUrl } = await createCheckoutSession({
      planId,
      redirectUrl: `${getAppUrl()}/procurements/${procurement.id}`,
      metadata: { procurement_id: procurement.id },
    })

    await admin
      .from("procurements")
      .update({ whop_checkout_id: checkoutId })
      .eq("id", procurement.id)

    return dataResponse({ procurement, checkout_url: checkoutUrl, download_payload: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout"
    const { data: failed } = await admin
      .from("procurements")
      .update({ status: "failed", failure_reason: message })
      .eq("id", procurement.id)
      .select("*")
      .single()

    return dataResponse({ procurement: failed, checkout_url: null, download_payload: null }, { status: 502 })
  }
}
