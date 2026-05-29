"use client"

import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { AssetCard } from "@/components/AssetCard"
import { Input } from "@/components/ui/input"
import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import type { AssetWithVariants } from "@/lib/marketplace/queries"
import type { Language } from "@/types/database"

export function MarketplaceSearch({ assets }: { assets: AssetWithVariants[] }) {
  const [query, setQuery] = useState("")
  const [language, setLanguage] = useState<Language | "all">("all")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return assets.filter((asset) => {
      const matchesLanguage = language === "all" || asset.source_language === language
      const haystack = [asset.title, asset.short_description, asset.summary, ...asset.tags]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !normalized || haystack.includes(normalized)

      return matchesLanguage && matchesQuery
    })
  }, [assets, language, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 md:flex-row">
        <label className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search behavior, purpose, engine terms, or tags"
            className="pl-9"
          />
        </label>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language | "all")}
          className="h-10 rounded-md border border-border bg-panel px-3 text-sm"
        >
          <option value="all">All source languages</option>
          {LANGUAGES.map((item) => (
            <option key={item} value={item}>
              {LANGUAGE_LABEL[item]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {assets.length} assets
      </p>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} variants={asset.variants} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
          No assets match those filters.
        </div>
      )}
    </div>
  )
}
