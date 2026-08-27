import { createHash } from "node:crypto"
import { dataResponse, errorResponse } from "@/lib/api"
import { LANGUAGES } from "@/lib/constants"
import { isDemoMode } from "@/lib/demo-mode"
import {
  DEMO_PUBLISH_COOLDOWN_MINUTES,
  DEMO_PUBLISH_GLOBAL_CAP_PER_HOUR,
  findDemoSnippet,
} from "@/lib/demo-walkthrough"
import { computeAssetPriceCents } from "@/lib/pricing"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const bodySchema = z.object({ snippetId: z.string().min(1) })

// Public, unauthenticated: this is the /try-it walkthrough's "publish as a
// seller" step. Only ever accepts a snippetId from the fixed whitelist in
// demo-walkthrough.ts — never arbitrary pasted code — and rate-limits by IP,
// since every accepted request costs a real Claude call per target language
// plus real Docker compute on the worker host.
export async function POST(request: Request) {
  if (isDemoMode()) {
    return errorResponse("The live try-it demo needs the real backend configured.", 503, {
      code: "DEMO_BACKEND_NOT_CONFIGURED",
    })
  }

  const developerId = process.env.DEMO_SAMPLE_DEVELOPER_ID

  if (!developerId) {
    return errorResponse(
      "The try-it demo isn't configured yet (DEMO_SAMPLE_DEVELOPER_ID missing).",
      503,
      { code: "DEMO_NOT_CONFIGURED" }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse("Missing or invalid snippetId", 400, { code: "DEMO_VALIDATION_FAILED" })
  }

  const snippet = findDemoSnippet(parsed.data.snippetId)

  if (!snippet) {
    return errorResponse("Unknown demo snippet", 400, { code: "DEMO_UNKNOWN_SNIPPET" })
  }

  const admin = createAdminClient()
  const ipHash = hashIp(clientIp(request))

  const { count: globalCount } = await admin
    .from("demo_publish_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString())

  if ((globalCount ?? 0) >= DEMO_PUBLISH_GLOBAL_CAP_PER_HOUR) {
    return errorResponse(
      "The live demo has hit its hourly capacity — try again later.",
      429,
      { code: "DEMO_GLOBAL_RATE_LIMITED" }
    )
  }

  const { data: recent } = await admin
    .from("demo_publish_log")
    .select("created_at")
    .eq("ip", ipHash)
    .gte("created_at", new Date(Date.now() - DEMO_PUBLISH_COOLDOWN_MINUTES * 60_000).toISOString())
    .limit(1)

  if (recent && recent.length > 0) {
    return errorResponse(
      `Try again in a few minutes — the demo is limited to one run every ${DEMO_PUBLISH_COOLDOWN_MINUTES} minutes per visitor.`,
      429,
      { code: "DEMO_RATE_LIMITED" }
    )
  }

  const contentHash = createHash("sha256").update(snippet.source_code).digest("hex")
  const priceCents = computeAssetPriceCents({ complexity: snippet.complexity, qualityScore: 0 })

  const { data: asset, error: assetError } = await admin
    .from("assets")
    .insert({
      developer_id: developerId,
      repo_id: null,
      source_type: "paste",
      source_language: snippet.source_language,
      title: `[Demo] ${snippet.title}`,
      short_description: snippet.short_description,
      long_description: null,
      summary: snippet.summary,
      tags: ["demo"],
      complexity: snippet.complexity,
      content_hash: contentHash,
      price_cents: priceCents,
      source_path: null,
      test_path: null,
      source_code: snippet.source_code,
      test_code: snippet.test_code,
      status: "verifying",
      is_demo_sample: true,
    })
    .select("id")
    .single()

  if (assetError || !asset) {
    return errorResponse(assetError?.message ?? "Could not create demo asset", 400, {
      code: "DEMO_ASSET_CREATE_FAILED",
    })
  }

  const { error: variantsError } = await admin.from("asset_variants").insert(
    LANGUAGES.map((language) => ({
      asset_id: asset.id,
      target_language: language,
      status: "queued",
    }))
  )

  if (variantsError) {
    await admin.from("assets").delete().eq("id", asset.id)
    return errorResponse(variantsError.message, 400, { code: "DEMO_VARIANT_CREATE_FAILED" })
  }

  await admin.from("demo_publish_log").insert({ ip: ipHash })

  return dataResponse({ assetId: asset.id })
}

// x-nf-client-connection-ip is set by Netlify's edge from the actual TCP
// connection — a client cannot forge it. x-forwarded-for is just whatever
// header value the client sent; trusting its client-supplied first hop (as
// this used to) let anyone bypass the per-IP cooldown with a fresh fake
// value on every request. Prefer the trusted Netlify header; fall back to
// the last hop of x-forwarded-for (appended by our own infra, not the
// client) only for non-Netlify environments.
function clientIp(request: Request): string {
  const trusted = request.headers.get("x-nf-client-connection-ip")
  if (trusted) return trusted.trim()

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return "unknown"
}

// Store only a hash of the client IP, never the raw address — the cooldown
// only needs to compare "same visitor within the window," not retain a
// reversible IP log.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}
