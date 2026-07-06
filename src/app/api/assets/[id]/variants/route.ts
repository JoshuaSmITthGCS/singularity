import { z } from "zod"
import { dataResponse, errorResponse } from "@/lib/api"
import { demoVariants, getDemoAsset } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { languageSchema } from "@/lib/validation"

const requestVariantSchema = z.object({
  language: languageSchema,
})

// On-demand translation (unit economics): cross-language variants are not
// produced at publish. A signed-in user requests a language here; the variant
// is queued and the worker translates + verifies it. Requeueing a failed
// variant is allowed — the worker escalates to the stronger model on retry.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: assetId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = requestVariantSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Variant request is invalid", 400, {
      code: "VARIANT_REQUEST_INVALID",
    })
  }

  const language = parsed.data.language

  if (isDemoMode()) {
    const asset = getDemoAsset(assetId)
    if (!asset) return errorResponse("Asset not found", 404, { code: "ASSET_NOT_FOUND" })

    const existing = demoVariants.find(
      (variant) => variant.asset_id === asset.id && variant.target_language === language
    )
    if (existing) return dataResponse({ variant: existing, requested: false })

    return dataResponse({
      variant: {
        id: "20000000-0000-4000-8000-000000000099",
        asset_id: asset.id,
        target_language: language,
        status: "queued",
      },
      requested: true,
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401, { code: "UNAUTHENTICATED" })

  const admin = createAdminClient()
  const { data: asset, error: assetError } = await admin
    .from("assets")
    .select("id, status, source_language, developer_id")
    .eq("id", assetId)
    .single()

  if (assetError || !asset) return errorResponse("Asset not found", 404, { code: "ASSET_NOT_FOUND" })
  if (asset.status !== "published") {
    return errorResponse("Asset is not published yet", 409, { code: "ASSET_NOT_PUBLISHED" })
  }

  const { data: existing } = await admin
    .from("asset_variants")
    .select("*")
    .eq("asset_id", asset.id)
    .eq("target_language", language)
    .maybeSingle()

  // Already passed / in flight: nothing to spend. Failed: requeue for a retry.
  if (existing) {
    if (existing.status !== "failed") {
      return dataResponse({ variant: existing, requested: false })
    }

    // Each retry of a failed variant costs an escalated LLM call. The
    // developer can retry immediately; everyone else waits out a cooldown so
    // a hostile loop can't drain the translation budget.
    const REQUEUE_COOLDOWN_MS = 6 * 60 * 60 * 1000
    const completedAt = existing.completed_at ? Date.parse(existing.completed_at) : 0
    const isDeveloper = user.id === asset.developer_id

    if (!isDeveloper && Date.now() - completedAt < REQUEUE_COOLDOWN_MS) {
      return errorResponse(
        "This language failed verification recently. Try again later.",
        429,
        { code: "VARIANT_RETRY_COOLDOWN" }
      )
    }

    const { data: requeued, error: requeueError } = await admin
      .from("asset_variants")
      .update({
        status: "queued",
        worker_claimed_by: null,
        worker_claimed_at: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single()

    if (requeueError) {
      return errorResponse(requeueError.message, 400, { code: "VARIANT_REQUEUE_FAILED" })
    }
    return dataResponse({ variant: requeued, requested: true })
  }

  const { data: variant, error: insertError } = await admin
    .from("asset_variants")
    .insert({ asset_id: asset.id, target_language: language, status: "queued" })
    .select("*")
    .single()

  if (insertError) {
    return errorResponse(insertError.message, 400, { code: "VARIANT_REQUEST_FAILED" })
  }

  return dataResponse({ variant, requested: true })
}
