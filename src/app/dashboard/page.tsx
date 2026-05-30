import Link from "next/link"
import { BadgeCheck, GitBranch, PackagePlus, PlugZap, Wallet } from "lucide-react"
import { GitHubInstallButton } from "@/components/GitHubInstallButton"
import { LanguageBadge } from "@/components/LanguageBadge"
import { ProcurementStatus } from "@/components/ProcurementStatus"
import { ServiceNotice } from "@/components/ServiceNotice"
import { WhopConnectButton } from "@/components/WhopConnectButton"
import { WhopPayoutsButton } from "@/components/WhopPayoutsButton"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import { demoAssets, demoPayments, demoProcurements, demoProfile, demoVariants } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { formatDate, formatMoney } from "@/lib/utils"
import type { AssetVariant, Language } from "@/types/database"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const demoMode = isDemoMode()
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let user: { id: string } | null = demoMode ? { id: demoProfile.id } : null

  if (!demoMode) {
    try {
      supabase = await createClient()
      const response = await supabase.auth.getUser()
      user = response.data.user
    } catch (error) {
      console.error("Dashboard auth unavailable", error)

      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <ServiceNotice description="The dashboard needs Supabase runtime environment variables configured in Netlify." />
        </main>
      )
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-border bg-panel p-8">
          <p className="text-sm font-medium uppercase text-muted-foreground">Creator console</p>
          <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
          <p className="mt-3 text-muted-foreground">Sign in to manage verified assets, procurements, and earnings.</p>
        </div>
      </main>
    )
  }

  const installationId = firstParam(params.installation_id)

  if (!demoMode && supabase && installationId && /^\d+$/.test(installationId)) {
    await supabase
      .from("profiles")
      .update({ github_installation_id: Number(installationId) })
      .eq("id", user.id)
  }

  let profile = demoMode ? demoProfile : null
  let assets = demoMode ? demoAssets : null
  let variants = demoMode ? demoVariants : null
  let procurements = demoMode ? demoProcurements : null
  let payments = demoMode ? demoPayments : null

  if (!demoMode && supabase) {
    try {
    const results = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("assets").select("*").eq("developer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("asset_variants").select("*"),
      supabase.from("procurements").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ])

    profile = results[0].data
    assets = results[1].data
    variants = results[2].data
    procurements = results[3].data
    payments = results[4].data

    // Self-heal onboarding state: if the developer created a connected Whop
    // company but we haven't recorded KYC completion, re-check with Whop and
    // persist it once they're cleared. Bounded — only runs while pending.
    if (profile?.whop_company_id && !profile.whop_kyc_complete) {
      try {
        const { isConnectedCompanyReady } = await import("@/lib/whop/client")
        if (await isConnectedCompanyReady(profile.whop_company_id)) {
          await supabase.from("profiles").update({ whop_kyc_complete: true }).eq("id", user.id)
          profile = { ...profile, whop_kyc_complete: true }
        }
      } catch (error) {
        console.error("Whop onboarding re-check failed", error)
      }
    }
    } catch (error) {
      console.error("Dashboard data unavailable", error)
    }
  }

  const variantsByAsset = new Map<string, AssetVariant[]>()
  ;(variants ?? []).forEach((variant) => {
    variantsByAsset.set(variant.asset_id, [...(variantsByAsset.get(variant.asset_id) ?? []), variant])
  })
  const publishedCount = (assets ?? []).filter((asset) => asset.status === "published").length
  const verifyingCount = (assets ?? []).filter((asset) => asset.status === "verifying").length
  const payoutsReady = Boolean(profile?.whop_company_id && profile?.whop_kyc_complete)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase text-muted-foreground">Creator console</p>
          <h1 className="mt-1 text-3xl font-semibold">Assets, procurements, earnings</h1>
          <p className="mt-2 text-muted-foreground">
            {demoMode
              ? "Demo data showing Stage 1 asset verification, client procurements, GitHub installation, and creator earnings."
              : "Track Stage 1 asset verification, client procurements, GitHub installation, and creator earnings."}
          </p>
        </div>
        <Link href="/publish" className={buttonVariants()}>
          <PackagePlus size={16} aria-hidden />
          Publish asset
        </Link>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-panel p-5">
          <PlugZap size={18} className="text-primary" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">GitHub App</p>
          <p className="mt-2 font-semibold">
            {profile?.github_installation_id ? `Installed #${profile.github_installation_id}` : "Not installed"}
          </p>
          <div className="mt-4">
            <GitHubInstallButton />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-panel p-5">
          <Wallet size={18} className="text-primary" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">Creator earnings</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(profile?.total_earnings_cents ?? 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current balance</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-5">
          <BadgeCheck size={18} className="text-primary" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">Stage 1 assets</p>
          <p className="mt-2 text-2xl font-semibold">{publishedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{verifyingCount} verifying</p>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-border bg-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Payouts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {payoutsReady
                ? "Whop is connected. Buyer payments split to your balance automatically — withdraw any time."
                : "Connect a Whop account to receive payments. Until this is done, your published assets can't be purchased."}
            </p>
          </div>
          {payoutsReady ? (
            <WhopPayoutsButton />
          ) : (
            <WhopConnectButton connected={Boolean(profile?.whop_company_id)} />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch size={19} className="text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Stage 1 assets</h2>
        </div>
        {(assets ?? []).length ? (
          <div className="grid gap-4">
            {(assets ?? []).map((asset) => {
              const assetVariants = variantsByAsset.get(asset.id) ?? []
              const variantByLanguage = new Map<Language, AssetVariant>()
              assetVariants.forEach((variant) => variantByLanguage.set(variant.target_language, variant))

              return (
                <article key={asset.id} className="rounded-lg border border-border bg-panel p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <h3 className="text-lg font-semibold">{asset.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{asset.short_description}</p>
                    </div>
                    <Badge tone={asset.status === "published" ? "success" : "warning"}>{asset.status}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {LANGUAGES.map((language) => (
                      <LanguageBadge
                        key={language}
                        language={language}
                        status={variantByLanguage.get(language)?.status}
                      />
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState message="No assets yet." />
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Client procurements</h2>
        {(procurements ?? []).length ? (
          <div className="overflow-hidden rounded-lg border border-border bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {(procurements ?? []).map((procurement) => (
                  <tr key={procurement.id} className="border-t border-border">
                    <td className="px-4 py-3">{formatDate(procurement.created_at)}</td>
                    <td className="px-4 py-3">{LANGUAGE_LABEL[procurement.target_language]}</td>
                    <td className="px-4 py-3">{procurement.delivery_method}</td>
                    <td className="px-4 py-3">
                      <ProcurementStatus status={procurement.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-primary underline" href={`/procurements/${procurement.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No procurements yet." />
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Creator earnings ledger</h2>
        {(payments ?? []).length ? (
          <div className="grid gap-3">
            {(payments ?? []).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border bg-panel p-4">
                <div>
                  <p className="font-medium">{formatMoney(payment.amount_cents)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">{payment.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No earnings yet." />
        )}
      </section>
    </main>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-6 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]

  return value
}
