import { Suspense } from "react"
import { MarketplaceSearch } from "@/components/MarketplaceSearch"
import { Page, PageHeader } from "@/components/PageHeader"
import { getMarketplaceAssets } from "@/lib/marketplace/queries"

export const dynamic = "force-dynamic"

export const metadata = { title: "Marketplace" }

export default async function MarketplacePage() {
  const assets = await getMarketplaceAssets()
  const verifiedTargets = assets.reduce(
    (count, asset) => count + asset.variants.filter((variant) => variant.status === "passed").length,
    0
  )

  return (
    <main>
      <PageHeader
        eyebrow="Procure"
        title="Find code by what it does"
        description="Filter by language, engine, and complexity. Every target listed here compiled and passed its tests in a sandbox."
        actions={
          <dl className="flex gap-6">
            <div className="text-right">
              <dt className="tag text-ink-4">Assets</dt>
              <dd className="mono tabular mt-0.5 text-xl text-ink">{assets.length}</dd>
            </div>
            <div className="text-right">
              <dt className="tag text-ink-4">Verified targets</dt>
              <dd className="mono tabular mt-0.5 text-xl text-[var(--pass)]">{verifiedTargets}</dd>
            </div>
          </dl>
        }
      />
      <Page>
        <Suspense fallback={<p className="text-sm text-ink-3">Loading search…</p>}>
          <MarketplaceSearch assets={assets} />
        </Suspense>
      </Page>
    </main>
  )
}
