import { notFound } from "next/navigation"
import { BadgeCheck, GitPullRequest, ShieldCheck } from "lucide-react"
import { LanguageBadge } from "@/components/LanguageBadge"
import { PurchaseForm } from "@/components/PurchaseForm"
import { Badge } from "@/components/ui/badge"
import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import { getMarketplaceAsset } from "@/lib/marketplace/queries"
import { formatMoney } from "@/lib/utils"
import type { Language } from "@/types/database"

export const dynamic = "force-dynamic"

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>
}) {
  const { assetId } = await params
  const asset = await getMarketplaceAsset(assetId)

  if (!asset) notFound()

  const variantsByLanguage = new Map<Language, (typeof asset.variants)[number]>()
  asset.variants.forEach((variant) => variantsByLanguage.set(variant.target_language, variant))
  const passedTargets = asset.variants.filter((variant) => variant.status === "passed").length

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <section className="space-y-7">
        <div>
          <Badge tone="info">{LANGUAGE_LABEL[asset.source_language]} source</Badge>
          <h1 className="mt-2 text-4xl font-semibold">{asset.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{asset.short_description}</p>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-panel p-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Stage 1</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-primary" aria-hidden />
              Verified baseline
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Verified targets</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <BadgeCheck size={16} className="text-primary" aria-hidden />
              {passedTargets} available
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Delivery</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <GitPullRequest size={16} className="text-primary" aria-hidden />
              Download or PR
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((language) => (
            <LanguageBadge
              key={language}
              language={language}
              status={variantsByLanguage.get(language)?.status}
            />
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Verification brief</h2>
          <p className="leading-7">{asset.summary}</p>
        </section>

        {asset.long_description ? (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Details</h2>
            <p className="whitespace-pre-wrap leading-7 text-muted-foreground">{asset.long_description}</p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {asset.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-panel p-5">
          <p className="text-sm text-muted-foreground">Price</p>
          <p className="mt-1 text-3xl font-semibold">{formatMoney(asset.price_cents)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Creator earnings follow the 70/30 platform split after delivery.
          </p>
        </div>
        <PurchaseForm assetId={asset.id} variants={asset.variants} />
      </aside>
    </main>
  )
}
