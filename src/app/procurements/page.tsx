import Link from "next/link"
import { EmptyState, Page, PageHeader } from "@/components/PageHeader"
import { ProcurementStatus } from "@/components/ProcurementStatus"
import { ServiceNotice } from "@/components/ServiceNotice"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { demoProcurements } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { formatDate, formatMoney } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProcurementsPage() {
  const demoMode = isDemoMode()
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let user: { id: string } | null = demoMode ? { id: "demo-user" } : null

  if (!demoMode) {
    try {
      supabase = await createClient()
      const response = await supabase.auth.getUser()
      user = response.data.user
    } catch (error) {
      console.error("Procurements auth unavailable", error)

      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <ServiceNotice description="Procurement history needs Supabase runtime environment variables configured in Netlify." />
        </main>
      )
    }
  }

  if (!user) {
    return (
      <main>
        <PageHeader
          eyebrow="Procure"
          title="Deliveries"
          description="Sign in to view adapted code and pull request deliveries."
        />
      </main>
    )
  }

  let procurements = demoMode ? demoProcurements : null

  if (!demoMode && supabase) {
    try {
    const response = await supabase
      .from("procurements")
      .select("*")
      .order("created_at", { ascending: false })
    procurements = response.data
    } catch (error) {
      console.error("Procurements data unavailable", error)
    }
  }

  const rows = procurements ?? []

  return (
    <main>
      <PageHeader
        eyebrow="Procure"
        title="Deliveries"
        description={
          demoMode
            ? "Demo delivery history — the targets you bought and how each one shipped."
            : "The targets you bought, and how each one shipped."
        }
      />
      <Page>
        {rows.length ? (
          <div className="overflow-hidden rounded border border-rule">
            {rows.map((procurement) => (
              <Link
                key={procurement.id}
                href={`/procurements/${procurement.id}`}
                className="flex items-center justify-between gap-4 border-b border-rule bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-sunken/60"
              >
                <div className="min-w-0">
                  <p className="mono text-sm text-ink">
                    {LANGUAGE_LABEL[procurement.target_language]}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-ink-3">
                    {formatDate(procurement.created_at)} · {formatMoney(procurement.price_cents)} ·{" "}
                    {procurement.delivery_method === "github_pr" ? "pull request" : "download"}
                  </p>
                </div>
                <ProcurementStatus status={procurement.status} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState message="No deliveries yet." />
        )}
      </Page>
    </main>
  )
}
