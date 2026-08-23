import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, Download, GitPullRequest, ShieldCheck } from "lucide-react"
import { PurchaseForm } from "@/components/PurchaseForm"
import { VerificationMatrix } from "@/components/Verification"
import { Badge } from "@/components/ui/badge"
import { LANGUAGE_LABEL, LANGUAGE_ENGINE_TAGS } from "@/lib/constants"
import { getMarketplaceAsset } from "@/lib/marketplace/queries"
import { formatMoney } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>
}) {
  const { assetId } = await params
  const asset = await getMarketplaceAsset(assetId)

  if (!asset) notFound()

  const passedTargets = asset.variants.filter((variant) => variant.status === "passed").length
  const totalTests = asset.variants.reduce((sum, variant) => sum + (variant.tests_passed ?? 0), 0)

  return (
    <main>
      <div className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-3">
            <Link href="/marketplace" className="hover:text-accent hover:underline">
              Marketplace
            </Link>
            <ChevronRight size={12} aria-hidden className="text-ink-4" />
            <span className="mono text-ink-3">{LANGUAGE_LABEL[asset.source_language]}</span>
          </nav>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h1 className="display text-[2rem] leading-tight text-ink">{asset.title}</h1>
              <p className="mt-2 text-[0.9375rem] leading-6 text-ink-2">{asset.short_description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{LANGUAGE_LABEL[asset.source_language]} original</Badge>
                {passedTargets > 0 ? (
                  <Badge tone="pass">
                    <ShieldCheck size={11} aria-hidden />
                    {passedTargets} verified {passedTargets === 1 ? "target" : "targets"}
                  </Badge>
                ) : null}
                {asset.procurement_count > 0 ? (
                  <Badge>
                    {asset.procurement_count} {asset.procurement_count === 1 ? "sale" : "sales"}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 md:text-right">
              <p className="tag text-ink-4">Price</p>
              <p className="mono tabular display mt-0.5 text-3xl text-ink">
                {formatMoney(asset.price_cents)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-7 px-5 py-7 lg:grid-cols-[1fr_21rem] lg:items-start">
        <div className="min-w-0 space-y-7">
          <VerificationMatrix variants={asset.variants} sourceLanguage={asset.source_language} />

          <section>
            <h2 className="display text-xl text-ink">What it does</h2>
            <p className="mt-2.5 text-[0.9375rem] leading-7 text-ink-2">{asset.summary}</p>
          </section>

          {asset.long_description ? (
            <section>
              <h2 className="display text-xl text-ink">Details</h2>
              <p className="mt-2.5 whitespace-pre-wrap text-[0.9375rem] leading-7 text-ink-2">
                {asset.long_description}
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="tag text-ink-4">Engines</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LANGUAGE_ENGINE_TAGS[asset.source_language].map((engine) => (
                <span
                  key={engine}
                  className="rounded border border-rule bg-surface px-1.5 py-0.5 text-xs text-ink-3"
                >
                  {engine}
                </span>
              ))}
            </div>
          </section>

          {asset.tags.length ? (
            <section>
              <h2 className="tag text-ink-4">Tags</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-rule bg-sunken px-1.5 py-0.5 text-xs text-ink-3"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <PurchaseForm assetId={asset.id} variants={asset.variants} />

          <div className="rounded border border-rule bg-surface p-3.5">
            <h2 className="tag text-ink-4">What you get</h2>
            <ul className="mt-2.5 space-y-2 text-sm text-ink-2">
              <li className="flex gap-2">
                <Download size={14} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
                Adapted source and its tests, ready to drop in.
              </li>
              <li className="flex gap-2">
                <GitPullRequest size={14} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
                Or a pull request opened straight into your repo.
              </li>
              <li className="flex gap-2">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
                <span className="tabular">
                  {totalTests} tests passed across verified targets.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
