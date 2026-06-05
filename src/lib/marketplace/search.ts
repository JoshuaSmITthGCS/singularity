import { createClient } from "@/lib/supabase/server"
import { isDemoMode } from "@/lib/demo-mode"
import { demoAssets } from "@/lib/demo-data"
import type { SearchQueryInput } from "@/lib/validation"
import type { MarketplaceSearchRow } from "@/types/database"

// §5.2 search result row from the marketplace_search view.
export type SearchResult = MarketplaceSearchRow

const MIN_RESULTS = 5
const MAX_RESULTS = 10

// §5.2.1 structured filter search over the marketplace_search view. SEARCH-001:
// return 5–10 results; when fewer than 5 strict matches exist, fill with broader
// (unfiltered) results flagged as `expanded`.
export async function searchAssets(params: SearchQueryInput): Promise<{
  results: SearchResult[]
  expanded: SearchResult[]
}> {
  if (isDemoMode()) {
    const all = demoDataAsResults()
    const strict = applyDemoFilters(all, params).slice(0, MAX_RESULTS)
    const expanded = strict.length < MIN_RESULTS ? all.filter((r) => !strict.includes(r)) : []
    return { results: strict, expanded: expanded.slice(0, MAX_RESULTS - strict.length) }
  }

  try {
    const supabase = await createClient()
    let query = supabase.from("marketplace_search").select("*")

    if (params.complexity) query = query.eq("complexity", params.complexity)
    if (params.lang?.length) query = query.in("primary_language", params.lang)
    if (params.genre?.length) query = query.overlaps("genre", params.genre)
    if (params.purpose?.length) query = query.overlaps("purpose", params.purpose)
    if (params.actions?.length) query = query.overlaps("actions", params.actions)
    if (params.engine?.length) query = query.overlaps("compatible_engines", params.engine)
    // §5.2.2: lightweight free-text — title/description/keywords. (Full semantic
    // re-ranking via ElasticSearch + cross-encoder is a later infra item.)
    if (params.q) {
      query = query.or(
        `title.ilike.%${params.q}%,short_description.ilike.%${params.q}%,summary.ilike.%${params.q}%`
      )
    }

    const { data, error } = await query
      .order("quality_score", { ascending: false, nullsFirst: false })
      .limit(MAX_RESULTS)

    if (error) {
      console.error("Search failed", error)
      return { results: [], expanded: [] }
    }

    const results = data ?? []

    // SEARCH-001 fallback: broaden when too few strict matches.
    if (results.length < MIN_RESULTS) {
      const { data: broad } = await supabase
        .from("marketplace_search")
        .select("*")
        .order("procurement_count", { ascending: false })
        .limit(MAX_RESULTS)
      const ids = new Set(results.map((r) => r.id))
      const expanded = (broad ?? [])
        .filter((r) => !ids.has(r.id))
        .slice(0, MAX_RESULTS - results.length)
      return { results, expanded }
    }

    return { results, expanded: [] }
  } catch (error) {
    console.error("Search is unavailable", error)
    return { results: [], expanded: [] }
  }
}

function demoDataAsResults(): SearchResult[] {
  return demoAssets
    .filter((a) => a.status === "published")
    .map((a) => ({
      id: a.id,
      developer_id: a.developer_id,
      primary_language: a.source_language,
      title: a.title,
      short_description: a.short_description,
      summary: a.summary,
      price_cents: a.price_cents,
      quality_score: 4.5,
      complexity: "medium",
      view_count: a.view_count,
      procurement_count: a.procurement_count,
      created_at: a.created_at,
      genre: a.tags,
      purpose: [],
      actions: [],
      keywords: a.tags,
      compatible_engines: [],
    }))
}

function applyDemoFilters(all: SearchResult[], params: SearchQueryInput) {
  return all.filter((r) => {
    if (params.complexity && r.complexity !== params.complexity) return false
    if (params.lang?.length && !params.lang.includes(r.primary_language as never)) return false
    if (params.q) {
      const haystack = `${r.title} ${r.short_description} ${r.summary}`.toLowerCase()
      if (!haystack.includes(params.q.toLowerCase())) return false
    }
    return true
  })
}
