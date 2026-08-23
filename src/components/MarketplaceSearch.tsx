"use client"

import { Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AssetCard } from "@/components/AssetCard"
import { SearchResultCard } from "@/components/SearchResultCard"
import { EmptyState } from "@/components/PageHeader"
import { Input } from "@/components/ui/input"
import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import { COMPLEXITY_LEVELS, ENGINES, GENRE_GROUPS } from "@/lib/taxonomy"
import type { AssetWithVariants } from "@/lib/marketplace/queries"
import type { SearchResult } from "@/lib/marketplace/search"
import type { Language } from "@/types/database"

type Filters = {
  q: string
  lang: Language[]
  genre: string[]
  engine: string[]
  complexity: string | null
}

const EMPTY_FILTERS: Filters = { q: "", lang: [], genre: [], engine: [], complexity: null }

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    q: params.get("q") ?? "",
    lang: params.getAll("lang") as Language[],
    genre: params.getAll("genre"),
    engine: params.getAll("engine"),
    complexity: params.get("complexity"),
  }
}

function isEmpty(filters: Filters) {
  return (
    !filters.q.trim() &&
    filters.lang.length === 0 &&
    filters.genre.length === 0 &&
    filters.engine.length === 0 &&
    !filters.complexity
  )
}

export function MarketplaceSearch({ assets }: { assets: AssetWithVariants[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [results, setResults] = useState<SearchResult[]>([])
  const [expanded, setExpanded] = useState<SearchResult[]>([])
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [facetsOpen, setFacetsOpen] = useState(false)

  const active = useMemo(() => !isEmpty(filters), [filters])

  // Reflect filters in the URL so searches are shareable/bookmarkable.
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.q.trim()) params.set("q", filters.q.trim())
    filters.lang.forEach((v) => params.append("lang", v))
    filters.genre.forEach((v) => params.append("genre", v))
    filters.engine.forEach((v) => params.append("engine", v))
    if (filters.complexity) params.set("complexity", filters.complexity)

    const query = params.toString()
    router.replace(query ? `/marketplace?${query}` : "/marketplace", { scroll: false })
  }, [filters, router])

  const runSearch = useCallback(async (current: Filters) => {
    if (isEmpty(current)) {
      setResults([])
      setExpanded([])
      setExpandedLabel(null)
      return
    }

    setLoading(true)
    const params = new URLSearchParams()
    if (current.q.trim()) params.set("q", current.q.trim())
    current.lang.forEach((v) => params.append("lang", v))
    current.genre.forEach((v) => params.append("genre", v))
    current.engine.forEach((v) => params.append("engine", v))
    if (current.complexity) params.set("complexity", current.complexity)

    try {
      const response = await fetch(`/api/search?${params.toString()}`)
      const body = await response.json()
      setResults(body?.data?.results ?? [])
      setExpanded(body?.data?.expanded ?? [])
      setExpandedLabel(body?.data?.expanded_label ?? null)
    } catch {
      setResults([])
      setExpanded([])
      setExpandedLabel(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce so free-text typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => runSearch(filters), 250)
    return () => clearTimeout(timeout)
  }, [filters, runSearch])

  function toggle<K extends "lang" | "genre" | "engine">(key: K, value: string) {
    setFilters((prev) => {
      const list = prev[key] as string[]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { ...prev, [key]: next }
    })
  }

  function setComplexity(value: string) {
    setFilters((prev) => ({ ...prev, complexity: prev.complexity === value ? null : value }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:items-start">
      {/* Filter rail. Facets stay visible while scanning results, the way a
          repo search or a subreddit sidebar does. */}
      <aside className="lg:sticky lg:top-6">
        <label className="relative block">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4"
            aria-hidden
          />
          <Input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Search behavior or tags"
            className="pl-8"
            aria-label="Search assets"
          />
        </label>

        {/* On mobile the facet stack buries the results, so it collapses.
            Kept in DOM order so focus order still matches the visual one. */}
        <button
          type="button"
          onClick={() => setFacetsOpen((value) => !value)}
          aria-expanded={facetsOpen}
          aria-controls="facets"
          className="mt-2 flex w-full items-center justify-between rounded border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink-2 lg:hidden"
        >
          Filters
          <span aria-hidden>{facetsOpen ? "−" : "+"}</span>
        </button>

        <div id="facets" className={`mt-4 space-y-4 ${facetsOpen ? "block" : "hidden"} lg:block`}>
          <FacetGroup label="Language">
            {LANGUAGES.map((item) => (
              <Chip key={item} active={filters.lang.includes(item)} onClick={() => toggle("lang", item)}>
                {LANGUAGE_LABEL[item]}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Complexity">
            {COMPLEXITY_LEVELS.map((item) => (
              <Chip key={item} active={filters.complexity === item} onClick={() => setComplexity(item)}>
                {item}
              </Chip>
            ))}
          </FacetGroup>

          <FacetGroup label="Engine">
            {ENGINES.map((item) => (
              <Chip key={item} active={filters.engine.includes(item)} onClick={() => toggle("engine", item)}>
                {item}
              </Chip>
            ))}
          </FacetGroup>

          {Object.entries(GENRE_GROUPS).map(([group, genres]) => (
            <FacetGroup key={group} label={group}>
              {genres.map((item) => (
                <Chip key={item} active={filters.genre.includes(item)} onClick={() => toggle("genre", item)}>
                  {item}
                </Chip>
              ))}
            </FacetGroup>
          ))}

          {active && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-accent underline underline-offset-2 hover:text-[var(--accent-hover)]"
            >
              Clear all filters
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {active ? (
          <SearchResults
            loading={loading}
            results={results}
            expanded={expanded}
            expandedLabel={expandedLabel}
          />
        ) : (
          <DefaultList assets={assets} />
        )}
      </div>
    </div>
  )
}

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="tag block pb-1.5 text-ink-4">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-1.5 py-0.5 text-xs capitalize transition-colors ${
        active
          ? "border-[var(--accent-rule)] bg-[var(--accent-soft)] font-medium text-accent"
          : "border-rule bg-surface text-ink-3 hover:border-rule-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

// Results live in one bordered list rather than a card grid: the rows are
// comparable, and a grid of boxes hides how many there are.
function ResultList({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded border border-rule">{children}</div>
}

function DefaultList({ assets }: { assets: AssetWithVariants[] }) {
  if (!assets.length) {
    return <EmptyState message="No assets published yet." />
  }

  return (
    <>
      <p className="mb-2 text-xs text-ink-3">
        <span className="tabular font-medium text-ink">{assets.length}</span> published assets
      </p>
      <ResultList>
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} variants={asset.variants} />
        ))}
      </ResultList>
    </>
  )
}

function SearchResults({
  loading,
  results,
  expanded,
  expandedLabel,
}: {
  loading: boolean
  results: SearchResult[]
  expanded: SearchResult[]
  expandedLabel: string | null
}) {
  if (loading && results.length === 0 && expanded.length === 0) {
    return <p className="text-sm text-ink-3">Searching…</p>
  }

  if (results.length === 0 && expanded.length === 0) {
    return <EmptyState message="No assets match those filters." />
  }

  return (
    <div className="space-y-7">
      {results.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-ink-3">
            <span className="tabular font-medium text-ink">{results.length}</span> match
            {results.length === 1 ? "" : "es"}
          </p>
          <ResultList>
            {results.map((asset) => (
              <SearchResultCard key={asset.id} asset={asset} />
            ))}
          </ResultList>
        </div>
      )}

      {expanded.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-ink-3">
            {expandedLabel ?? "Related assets you may not have considered"}
          </p>
          <ResultList>
            {expanded.map((asset) => (
              <SearchResultCard key={asset.id} asset={asset} />
            ))}
          </ResultList>
        </div>
      )}
    </div>
  )
}
