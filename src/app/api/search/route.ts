import { dataResponse, errorResponse } from "@/lib/api"
import { searchAssets } from "@/lib/marketplace/search"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"
import { searchQuerySchema } from "@/lib/validation"

// §8.1 GET /api/v1/search — structured filter + free-text marketplace search.
// Array params repeat (?genre=game&genre=web); complexity/q/page are scalar.
export async function GET(request: Request) {
  const rateLimit = await checkRateLimit({
    key: `search:ip:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  const url = new URL(request.url)
  const sp = url.searchParams

  const parsed = searchQuerySchema.safeParse({
    q: sp.get("q") ?? undefined,
    genre: sp.getAll("genre").length ? sp.getAll("genre") : undefined,
    purpose: sp.getAll("purpose").length ? sp.getAll("purpose") : undefined,
    actions: sp.getAll("actions").length ? sp.getAll("actions") : undefined,
    engine: sp.getAll("engine").length ? sp.getAll("engine") : undefined,
    complexity: sp.get("complexity") ?? undefined,
    lang: sp.getAll("lang").length ? sp.getAll("lang") : undefined,
    page: sp.get("page") ?? undefined,
  })

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid search query", 400, {
      code: "SEARCH_VALIDATION_FAILED",
    })
  }

  const { results, expanded } = await searchAssets(parsed.data)

  return dataResponse({
    results,
    // SEARCH-001: expanded results are clearly labeled for the UI.
    expanded,
    expanded_label: expanded.length ? "Related assets you may not have considered" : null,
  })
}
