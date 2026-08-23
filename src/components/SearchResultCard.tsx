import Link from "next/link"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { formatMoney } from "@/lib/utils"
import type { SearchResult } from "@/lib/marketplace/search"

// The marketplace_search view only carries the source-language row, so this
// can't show a per-language run strip the way AssetCard does — it leads with the
// structured tags and quality score instead.
export function SearchResultCard({ asset }: { asset: SearchResult }) {
  const chips = [...(asset.genre ?? []), ...(asset.purpose ?? [])].slice(0, 5)

  return (
    <article className="group relative border-b border-rule bg-surface px-4 py-3.5 transition-colors last:border-b-0 hover:bg-sunken/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold leading-6 text-ink">
            <Link href={`/marketplace/${asset.id}`} className="after:absolute after:inset-0">
              {asset.title}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-ink-2">
            {asset.short_description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="mono tabular text-sm font-medium text-ink">{formatMoney(asset.price_cents)}</p>
          {asset.quality_score !== null ? (
            <p className="tag mt-0.5 text-ink-4">Q {asset.quality_score.toFixed(1)}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-4">
        <span className="mono">{LANGUAGE_LABEL[asset.primary_language]} original</span>
        {chips.map((tag) => (
          <span key={tag} className="before:mr-2 before:content-['·']">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
