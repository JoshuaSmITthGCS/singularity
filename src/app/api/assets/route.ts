import { dataResponse, errorResponse } from "@/lib/api"
import { LANGUAGES } from "@/lib/constants"
import { demoAssets } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { createAssetSchema } from "@/lib/validation"

export async function POST(request: Request) {
  if (isDemoMode()) {
    const body = await request.json().catch(() => null)
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Asset payload is invalid", 400)
    }

    return dataResponse({
      asset: {
        ...demoAssets[0],
        id: "10000000-0000-4000-8000-000000000099",
        title: parsed.data.title,
        short_description: parsed.data.short_description,
        summary: parsed.data.summary,
        source_language: parsed.data.source_language,
        status: "verifying",
      },
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const body = await request.json().catch(() => null)
  const parsed = createAssetSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Asset payload is invalid", 400)
  }

  const input = parsed.data
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      developer_id: user.id,
      repo_id: null,
      source_type: input.source_type,
      source_language: input.source_language,
      title: input.title,
      short_description: input.short_description,
      long_description: input.long_description || null,
      summary: input.summary,
      tags: input.tags,
      source_path: input.source_path || null,
      test_path: input.test_path || null,
      source_code: input.source_code,
      test_code: input.test_code,
      price_cents: input.price_cents,
      status: "verifying",
    })
    .select("*")
    .single()

  if (assetError) return errorResponse(assetError.message, 400)

  const { error: variantsError } = await supabase.from("asset_variants").insert(
    LANGUAGES.map((language) => ({
      asset_id: asset.id,
      target_language: language,
      status: "queued",
    }))
  )

  if (variantsError) {
    await supabase.from("assets").delete().eq("id", asset.id)
    return errorResponse(variantsError.message, 400)
  }

  return dataResponse({ asset })
}
