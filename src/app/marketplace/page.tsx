import { MarketplaceSearch } from "@/components/MarketplaceSearch"
import { getMarketplaceAssets } from "@/lib/marketplace/queries"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const assets = await getMarketplaceAssets()
  const verifiedTargets = assets.reduce(
    (count, asset) => count + asset.variants.filter((variant) => variant.status === "passed").length,
    0
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase text-muted-foreground">Client search</p>
          <h1 className="mt-1 text-3xl font-semibold">Find trusted code by function</h1>
          <p className="mt-2 text-muted-foreground">
            Browse Stage 1 verified assets and pick targets that already passed automated checks for TypeScript, JavaScript, and Java.
          </p>
        </div>
        <div className="grid min-w-64 grid-cols-2 overflow-hidden rounded-lg border border-border bg-panel text-sm">
          <div className="border-r border-border p-4">
            <p className="text-muted-foreground">Assets</p>
            <p className="mt-1 text-2xl font-semibold">{assets.length}</p>
          </div>
          <div className="p-4">
            <p className="text-muted-foreground">Verified targets</p>
            <p className="mt-1 text-2xl font-semibold">{verifiedTargets}</p>
          </div>
        </div>
      </div>
      <div className="mb-5 rounded-lg border border-[#dbc38f] bg-[var(--accent-soft)] p-4 text-sm text-[#744c16]">
        <p>
          Current beachhead: reusable scripting assets for teams that need portability and clear quality signals before integration.
        </p>
      </div>
      <MarketplaceSearch assets={assets} />
    </main>
  )
}
