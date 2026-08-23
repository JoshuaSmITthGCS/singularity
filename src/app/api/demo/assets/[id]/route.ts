import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"

// Public: polled by the /try-it "publish as a seller" step to show live
// translate/test progress from the real worker. Scoped to is_demo_sample=true
// only — never exposes a real developer's asset by id guess.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isDemoMode()) {
    return errorResponse("The live try-it demo needs the real backend configured.", 503, {
      code: "DEMO_BACKEND_NOT_CONFIGURED",
    })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data: asset, error: assetError } = await admin
    .from("assets")
    .select("id, title, status, source_language, is_demo_sample")
    .eq("id", id)
    .eq("is_demo_sample", true)
    .single()

  if (assetError || !asset) return errorResponse("Demo asset not found", 404, { code: "DEMO_ASSET_NOT_FOUND" })

  const { data: variants, error: variantsError } = await admin
    .from("asset_variants")
    .select("target_language, status, tests_total, tests_passed, tests_failed")
    .eq("asset_id", id)

  if (variantsError) return errorResponse(variantsError.message, 400, { code: "DEMO_VARIANTS_FETCH_FAILED" })

  return dataResponse({
    asset: { id: asset.id, title: asset.title, status: asset.status, source_language: asset.source_language },
    variants: variants ?? [],
  })
}
