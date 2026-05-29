import Link from "next/link"
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-border bg-panel p-8">
          <p className="text-sm font-medium uppercase text-muted-foreground">Client delivery</p>
          <h1 className="mt-1 text-3xl font-semibold">Procurements</h1>
          <p className="mt-3 text-muted-foreground">Sign in to view adapted code and pull request deliveries.</p>
        </div>
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div>
        <p className="text-sm font-medium uppercase text-muted-foreground">Stage 2 delivery</p>
        <h1 className="mt-1 text-3xl font-semibold">Procurements</h1>
        <p className="mt-2 text-muted-foreground">
          {demoMode
            ? "Demo procurement history showing client selections, verified targets, and delivery outcomes."
            : "Track client selections, verified targets, and delivery outcomes."}
        </p>
      </div>
      <div className="mt-6 grid gap-3">
        {(procurements ?? []).map((procurement) => (
          <Link
            key={procurement.id}
            href={`/procurements/${procurement.id}`}
            className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-panel p-5 md:flex-row md:items-center"
          >
            <div>
              <p className="font-medium">{LANGUAGE_LABEL[procurement.target_language]}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(procurement.created_at)} - {formatMoney(procurement.price_cents)}
              </p>
            </div>
            <ProcurementStatus status={procurement.status} />
          </Link>
        ))}
      </div>
    </main>
  )
}
