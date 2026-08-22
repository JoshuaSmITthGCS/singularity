import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { formatMoney } from "@/lib/utils"
import type { SearchResult } from "@/lib/marketplace/search"

// Lighter-weight card for /api/search rows. The marketplace_search view
// doesn't join per-variant status (only the source-language row is present),
// so this can't reuse AssetCard's per-language verification badges — it
// surfaces the structured tags instead.
export function SearchResultCard({ asset }: { asset: SearchResult }) {
  const chips = [...(asset.genre ?? []), ...(asset.purpose ?? [])].slice(0, 4)

  return (
    <article className="rounded-lg border border-border bg-panel p-5 shadow-sm transition hover:border-[#aac6bb]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="info">{LANGUAGE_LABEL[asset.primary_language]} source</Badge>
          <h3 className="mt-1 text-lg font-semibold">{asset.title}</h3>
        </div>
        <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-semibold">
          {formatMoney(asset.price_cents)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14} className="text-primary" aria-hidden />
        <span>Stage 1 verified baseline</span>
        {asset.quality_score !== null && (
          <>
            <span className="text-border">|</span>
            <span>Quality {asset.quality_score.toFixed(1)}/5</span>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{asset.short_description}</p>
      <p className="mt-3 line-clamp-3 text-sm">{asset.summary}</p>
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((tag) => (
            <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/marketplace/${asset.id}`}
        className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-5" })}
      >
        View asset
        <ArrowRight size={15} aria-hidden />
      </Link>
    </article>
  )
}
