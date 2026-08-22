"use client"

import { Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AssetCard } from "@/components/AssetCard"
import { SearchResultCard } from "@/components/SearchResultCard"
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
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-panel p-4">
        <label className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Search behavior, purpose, engine terms, or tags"
            className="pl-9"
          />
        </label>

        <div className="flex flex-wrap gap-4 text-xs">
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
              className="self-end text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {active ? (
        <SearchResults
          loading={loading}
          results={results}
          expanded={expanded}
          expandedLabel={expandedLabel}
        />
      ) : (
        <DefaultGrid assets={assets} />
      )}
    </div>
  )
}

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
      className={`rounded-full border px-2.5 py-1 text-xs capitalize transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-[#aac6bb]"
      }`}
    >
      {children}
    </button>
  )
}

function DefaultGrid({ assets }: { assets: AssetWithVariants[] }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">Showing {assets.length} assets</p>
      {assets.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} variants={asset.variants} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
          No assets published yet.
        </div>
      )}
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
    return <p className="text-sm text-muted-foreground">Searching…</p>
  }

  if (results.length === 0 && expanded.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
        No assets match those filters.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {results.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {results.length} match{results.length === 1 ? "" : "es"}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((asset) => (
              <SearchResultCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {expanded.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {expandedLabel ?? "Related assets you may not have considered"}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {expanded.map((asset) => (
              <SearchResultCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
