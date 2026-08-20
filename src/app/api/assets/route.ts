import { createHash } from "node:crypto"
import { dataResponse, errorResponse } from "@/lib/api"
import { LANGUAGES, getTranslationMode } from "@/lib/constants"
import { demoAssets } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { computeAssetPriceCents } from "@/lib/pricing"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { createAssetSchema } from "@/lib/validation"

// Publish is the most expensive route in the system: it triggers a Docker
// verification run (and, once a language is requested, an LLM translation).
// 5/hour keeps a runaway loop from draining the Anthropic budget or the
// worker's Docker capacity.
const PUBLISH_LIMIT = 5
const PUBLISH_WINDOW_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  if (isDemoMode()) {
    const rateLimit = await checkRateLimit({
      key: `assets:ip:${getClientIp(request)}`,
      limit: PUBLISH_LIMIT,
      windowMs: PUBLISH_WINDOW_MS,
    })
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

    const body = await request.json().catch(() => null)
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Asset payload is invalid", 400, {
        code: "ASSET_VALIDATION_FAILED",
      })
    }

    return dataResponse({
      asset: {
        ...demoAssets[0],
        id: "10000000-0000-4000-8000-000000000099",
        title: parsed.data.title,
        short_description: parsed.data.short_description,
        summary: parsed.data.summary,
        source_language: parsed.data.source_language,
        complexity: parsed.data.complexity,
        // §7.4: price is formula-derived. Pre-analysis quality_score is unknown,
        // so the initial price uses complexity only (quality bonus added once
        // the ingestion pipeline scores the asset).
        price_cents: computeAssetPriceCents({ complexity: parsed.data.complexity, qualityScore: 0 }),
        status: "verifying",
      },
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401, { code: "UNAUTHENTICATED" })

  const rateLimit = await checkRateLimit({
    key: `assets:user:${user.id}`,
    limit: PUBLISH_LIMIT,
    windowMs: PUBLISH_WINDOW_MS,
  })
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  const body = await request.json().catch(() => null)
  const parsed = createAssetSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Asset payload is invalid", 400, {
      code: "ASSET_VALIDATION_FAILED",
    })
  }

  const input = parsed.data

  // Cap concurrent unverified assets per developer: each one holds a Docker
  // verification slot, so an unbounded queue of "verifying" assets is a cost
  // and capacity risk independent of the hourly rate limit above.
  const { count: verifyingCount } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("developer_id", user.id)
    .eq("status", "verifying")

  if ((verifyingCount ?? 0) >= 3) {
    return errorResponse(
      "You have 3 assets still verifying. Wait for one to finish before publishing another.",
      429,
      { code: "TOO_MANY_PENDING_VERIFICATIONS" }
    )
  }

  // §7.2: content hash of the canonical source snapshot, anchored with the asset.
  const contentHash = createHash("sha256").update(input.source_code).digest("hex")
  // §7.4: initial price from complexity; quality bonus applied post-analysis.
  const priceCents = computeAssetPriceCents({ complexity: input.complexity, qualityScore: 0 })

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
      // legacy freeform tags column retained; structured tags live in asset_tags
      tags: input.tags?.keywords ?? [],
      complexity: input.complexity,
      content_hash: contentHash,
      price_cents: priceCents,
      source_path: input.source_path || null,
      test_path: input.test_path || null,
      source_code: input.source_code,
      test_code: input.test_code,
      status: "verifying",
    })
    .select("*")
    .single()

  if (assetError) return errorResponse(assetError.message, 400, { code: "ASSET_CREATE_FAILED" })

  // §4.5: persist developer-provided structured tags as the v1 tag record with
  // source 'developer'. The worker appends an 'llm_v1' version during ingestion.
  if (input.tags) {
    await supabase.from("asset_tags").insert({
      asset_id: asset.id,
      version: 1,
      source: "developer",
      genre: input.tags.genre ?? [],
      purpose: input.tags.purpose ?? [],
      actions: input.tags.actions ?? [],
      keywords: input.tags.keywords ?? [],
      compatible_engines: input.tags.compatible_engines ?? [],
      complexity: input.complexity,
      short_description: input.short_description,
      long_description: input.long_description || null,
      confidence_score: 1.0,
    })
  }

  // Unit economics: in on_demand mode only the source language is verified at
  // publish (Docker run, no LLM call). Cross-language variants are created by
  // POST /api/assets/[id]/variants when a buyer asks for them, so translation
  // spend is incurred only where there is demand.
  const publishLanguages =
    getTranslationMode() === "eager" ? LANGUAGES : [input.source_language]

  const { error: variantsError } = await supabase.from("asset_variants").insert(
    publishLanguages.map((language) => ({
      asset_id: asset.id,
      target_language: language,
      status: "queued",
    }))
  )

  if (variantsError) {
    await supabase.from("assets").delete().eq("id", asset.id)
    return errorResponse(variantsError.message, 400, { code: "ASSET_VARIANT_CREATE_FAILED" })
  }

  return dataResponse({ asset })
}
