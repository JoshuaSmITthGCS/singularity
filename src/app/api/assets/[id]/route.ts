import { dataResponse, errorResponse } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const { data: fullAsset } = await supabase.from("assets").select("*").eq("id", id).maybeSingle()

  if (fullAsset) {
    const { data: variants, error: variantsError } = await supabase
      .from("asset_variants")
      .select("*")
      .eq("asset_id", id)

    if (variantsError) return errorResponse(variantsError.message, 400)

    return dataResponse({
      asset: fullAsset,
      variants: variants ?? [],
      full: true,
    })
  }

  const { data: asset, error: assetError } = await supabase
    .from("marketplace_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (assetError) return errorResponse(assetError.message, 400)
  if (!asset) return errorResponse("Asset not found", 404)

  const { data: variants, error: variantsError } = await supabase
    .from("marketplace_variants")
    .select("*")
    .eq("asset_id", id)

  if (variantsError) return errorResponse(variantsError.message, 400)

  return dataResponse({
    asset,
    variants: variants ?? [],
    full: false,
  })
}
