import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { LanguageBadge } from "@/components/LanguageBadge"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import { formatMoney } from "@/lib/utils"
import type { Language, MarketplaceAsset, MarketplaceVariant } from "@/types/database"

export function AssetCard({
  asset,
  variants,
}: {
  asset: MarketplaceAsset
  variants: MarketplaceVariant[]
}) {
  const variantByLanguage = new Map<Language, MarketplaceVariant>()
  variants.forEach((variant) => variantByLanguage.set(variant.target_language, variant))
  const passedCount = variants.filter((variant) => variant.status === "passed").length

  return (
    <article className="rounded-lg border border-border bg-panel p-5 shadow-sm transition hover:border-[#aac6bb]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="info">{LANGUAGE_LABEL[asset.source_language]} source</Badge>
          <h3 className="mt-1 text-lg font-semibold">{asset.title}</h3>
        </div>
        <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-semibold">
          {formatMoney(asset.price_cents)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14} className="text-primary" aria-hidden />
        <span>Stage 1 verified baseline</span>
        <span className="text-border">|</span>
        <span>{passedCount} verified targets</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{asset.short_description}</p>
      <p className="mt-3 line-clamp-3 text-sm">{asset.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LANGUAGES.map((language) => (
          <LanguageBadge
            key={language}
            language={language}
            status={variantByLanguage.get(language)?.status}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {asset.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
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
