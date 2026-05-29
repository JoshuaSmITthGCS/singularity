import { createClient } from "@/lib/supabase/server"
import { demoAssets, demoVariants } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import type { MarketplaceAsset, MarketplaceVariant } from "@/types/database"

export type AssetWithVariants = MarketplaceAsset & {
  variants: MarketplaceVariant[]
}

export async function getMarketplaceAssets() {
  if (isDemoMode()) {
    return attachVariants(demoMarketplaceAssets(), demoVariants)
  }

  try {
    const supabase = await createClient()

    const [{ data: assets, error: assetsError }, { data: variants, error: variantsError }] =
      await Promise.all([
        supabase.from("marketplace_assets").select("*").order("created_at", { ascending: false }),
        supabase.from("marketplace_variants").select("*"),
      ])

    if (assetsError) {
      console.error("Could not load marketplace assets", assetsError)
      return []
    }

    if (variantsError) {
      console.error("Could not load marketplace variants", variantsError)
      return attachVariants(assets ?? [], [])
    }

    return attachVariants(assets ?? [], variants ?? [])
  } catch (error) {
    console.error("Marketplace is unavailable", error)
    return []
  }
}

export async function getMarketplaceAsset(assetId: string) {
  if (isDemoMode()) {
    const asset = demoMarketplaceAssets().find((item) => item.id === assetId)

    if (!asset) return null

    return {
      ...asset,
      variants: demoVariants.filter((variant) => variant.asset_id === assetId),
    }
  }

  try {
    const supabase = await createClient()

    const [{ data: asset, error: assetError }, { data: variants, error: variantsError }] =
      await Promise.all([
        supabase.from("marketplace_assets").select("*").eq("id", assetId).single(),
        supabase.from("marketplace_variants").select("*").eq("asset_id", assetId),
      ])

    if (assetError) return null

    if (variantsError) {
      console.error("Could not load marketplace asset variants", variantsError)
    }

    return {
      ...asset,
      variants: variants ?? [],
    }
  } catch (error) {
    console.error("Marketplace asset is unavailable", error)
    return null
  }
}

function demoMarketplaceAssets(): MarketplaceAsset[] {
  return demoAssets
    .filter((asset) => asset.status === "published" || asset.status === "verifying")
    .map((asset) => ({
      id: asset.id,
      developer_id: asset.developer_id,
      source_language: asset.source_language,
      title: asset.title,
      short_description: asset.short_description,
      long_description: asset.long_description,
      summary: asset.summary,
      tags: asset.tags,
      price_cents: asset.price_cents,
      view_count: asset.view_count,
      procurement_count: asset.procurement_count,
      created_at: asset.created_at,
    }))
}

function attachVariants(assets: MarketplaceAsset[], variants: MarketplaceVariant[]) {
  const byAsset = new Map<string, MarketplaceVariant[]>()

  for (const variant of variants) {
    byAsset.set(variant.asset_id, [...(byAsset.get(variant.asset_id) ?? []), variant])
  }

  return assets.map((asset) => ({
    ...asset,
    variants: byAsset.get(asset.id) ?? [],
  }))
}
