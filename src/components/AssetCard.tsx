import Link from "next/link"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { VerificationStrip } from "@/components/Verification"
import { formatMoney } from "@/lib/utils"
import type { MarketplaceAsset, MarketplaceVariant } from "@/types/database"

/**
 * A dense feed row, not a marketing card. Buyers scan many of these looking for
 * one thing — is it verified in my language — so the run strip sits on the same
 * line as the title and the price is right-aligned for column comparison.
 */
export function AssetCard({
  asset,
  variants,
}: {
  asset: MarketplaceAsset
  variants: MarketplaceVariant[]
}) {
  const passed = variants.filter((variant) => variant.status === "passed").length

  return (
    <article className="group relative border-b border-rule bg-surface px-4 py-3.5 transition-colors last:border-b-0 hover:bg-sunken/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold leading-6 text-ink">
            {/* Stretched link keeps the whole row clickable without nesting
                interactive elements inside a link. */}
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
          <p className="tag mt-0.5 text-ink-4">{passed}/5 verified</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <VerificationStrip variants={variants} sourceLanguage={asset.source_language} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-4">
        <span className="mono">{LANGUAGE_LABEL[asset.source_language]} original</span>
        {asset.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="before:mr-2 before:content-['·']">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
