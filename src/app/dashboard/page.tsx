import Link from "next/link"
import { BadgeCheck, GitBranch, PackagePlus, PlugZap, Wallet } from "lucide-react"
import { GitHubInstallButton } from "@/components/GitHubInstallButton"
import { EmptyState, Page, PageHeader, Panel } from "@/components/PageHeader"
import { ProcurementStatus } from "@/components/ProcurementStatus"
import { VerificationStrip } from "@/components/Verification"
import { ServiceNotice } from "@/components/ServiceNotice"
import { WhopConnectButton } from "@/components/WhopConnectButton"
import { WhopPayoutsButton } from "@/components/WhopPayoutsButton"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { demoAssets, demoPayments, demoProcurements, demoProfile, demoVariants } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { formatDate, formatMoney } from "@/lib/utils"
import type { AssetVariant } from "@/types/database"

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
        <main>
          <Page className="max-w-2xl">
            <ServiceNotice description="The dashboard needs Supabase runtime environment variables configured." />
          </Page>
        </main>
      )
    }
  }

  if (!user) {
    return (
      <main>
        <PageHeader
          eyebrow="Publish"
          title="Dashboard"
          description="Sign in to manage verified assets, deliveries, and earnings."
        />
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
    <main>
      <PageHeader
        eyebrow="Publish"
        title="Creator console"
        description={
          demoMode
            ? "Demo data: verification runs, buyer deliveries, and earnings."
            : "Your verification runs, buyer deliveries, and earnings."
        }
        actions={
          <Link href="/publish" className={buttonVariants({ size: "sm" })}>
            <PackagePlus size={14} aria-hidden />
            New asset
          </Link>
        }
      />

      <Page className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Creator earnings"
            value={formatMoney(profile?.total_earnings_cents ?? 0)}
            hint="Current balance"
            icon={<Wallet size={14} aria-hidden />}
          />
          <Stat
            label="Published assets"
            value={String(publishedCount)}
            hint={`${verifyingCount} still verifying`}
            icon={<BadgeCheck size={14} aria-hidden />}
          />
          <Stat
            label="GitHub App"
            value={profile?.github_installation_id ? "Installed" : "Not installed"}
            hint={
              profile?.github_installation_id
                ? `Installation #${profile.github_installation_id}`
                : "Required for PR delivery"
            }
            icon={<PlugZap size={14} aria-hidden />}
            action={<GitHubInstallButton demoMode={demoMode} />}
          />
        </section>

        <Panel title="Payouts">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-ink-2">
              {payoutsReady
                ? "Whop is connected. Buyer payments split to your balance automatically — withdraw any time."
                : "Connect a Whop account to receive payments. Until this is done, your published assets can't be purchased."}
            </p>
            {payoutsReady ? (
              <WhopPayoutsButton />
            ) : (
              <WhopConnectButton connected={Boolean(profile?.whop_company_id)} />
            )}
          </div>
        </Panel>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <GitBranch size={15} className="text-ink-4" aria-hidden />
            <h2 className="tag text-ink-3">Your assets</h2>
          </div>
          {(assets ?? []).length ? (
            <div className="overflow-hidden rounded border border-rule">
              {(assets ?? []).map((asset) => (
                <article key={asset.id} className="border-b border-rule bg-surface px-4 py-3.5 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[0.9375rem] font-semibold text-ink">{asset.title}</h3>
                      <p className="mt-0.5 text-sm leading-6 text-ink-2">{asset.short_description}</p>
                    </div>
                    <Badge tone={asset.status === "published" ? "pass" : "run"}>{asset.status}</Badge>
                  </div>
                  <div className="mt-2.5">
                    <VerificationStrip
                      variants={variantsByAsset.get(asset.id) ?? []}
                      sourceLanguage={asset.source_language}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No assets yet."
              action={
                <Link href="/publish" className={buttonVariants({ size: "sm" })}>
                  Publish your first asset
                </Link>
              }
            />
          )}
        </section>

        <section>
          <h2 className="tag mb-2 text-ink-3">Buyer deliveries</h2>
          {(procurements ?? []).length ? (
            <div className="overflow-x-auto rounded border border-rule bg-surface">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-rule bg-sunken">
                  <tr className="tag text-ink-4">
                    <th scope="col" className="px-4 py-2 font-normal">Created</th>
                    <th scope="col" className="px-4 py-2 font-normal">Language</th>
                    <th scope="col" className="px-4 py-2 font-normal">Delivery</th>
                    <th scope="col" className="px-4 py-2 font-normal">Status</th>
                    <th scope="col" className="px-4 py-2 font-normal"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {(procurements ?? []).map((procurement) => (
                    <tr key={procurement.id}>
                      <td className="tabular px-4 py-2.5 text-ink-2">{formatDate(procurement.created_at)}</td>
                      <td className="mono px-4 py-2.5 text-xs text-ink">{LANGUAGE_LABEL[procurement.target_language]}</td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {procurement.delivery_method === "github_pr" ? "pull request" : "download"}
                      </td>
                      <td className="px-4 py-2.5"><ProcurementStatus status={procurement.status} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <Link className="text-accent hover:underline" href={`/procurements/${procurement.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No deliveries yet." />
          )}
        </section>

        <section>
          <h2 className="tag mb-2 text-ink-3">Earnings ledger</h2>
          {(payments ?? []).length ? (
            <div className="overflow-hidden rounded border border-rule">
              {(payments ?? []).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b border-rule bg-surface px-4 py-2.5 last:border-b-0"
                >
                  <div>
                    <p className="mono tabular text-sm text-ink">{formatMoney(payment.amount_cents)}</p>
                    <p className="tabular mt-0.5 text-xs text-ink-3">{formatDate(payment.created_at)}</p>
                  </div>
                  <Badge tone={payment.status === "paid" ? "pass" : "run"}>{payment.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No earnings yet." />
          )}
        </section>
      </Page>
    </main>
  )
}

function Stat({
  label,
  value,
  hint,
  icon,
  action,
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded border border-rule bg-surface p-3.5">
      <p className="tag flex items-center gap-1.5 text-ink-4">
        <span className="text-ink-4">{icon}</span>
        {label}
      </p>
      <p className="tabular mt-1.5 text-xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-3">{hint}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]

  return value
}
