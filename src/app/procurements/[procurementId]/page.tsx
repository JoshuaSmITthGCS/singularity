import Link from "next/link"
import { notFound } from "next/navigation"
import { ProcurementStatus } from "@/components/ProcurementStatus"
import { ServiceNotice } from "@/components/ServiceNotice"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { getDemoAsset, getDemoProcurement, getDemoVariant } from "@/lib/demo-data"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { formatDate, formatMoney } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProcurementDetailPage({
  params,
}: {
  params: Promise<{ procurementId: string }>
}) {
  const { procurementId } = await params
  const demoMode = isDemoMode()
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null

  if (!demoMode) {
    try {
      supabase = await createClient()
    } catch (error) {
      console.error("Procurement detail unavailable", error)

      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <ServiceNotice description="Procurement details need Supabase runtime environment variables configured in Netlify." />
        </main>
      )
    }
  }

  const procurement = demoMode
    ? getDemoProcurement(procurementId)
    : (
        await supabase!
          .from("procurements")
          .select("*")
          .eq("id", procurementId)
          .maybeSingle()
      ).data

  if (!procurement) notFound()

  const asset = demoMode
    ? getDemoAsset(procurement.asset_id)
    : (await supabase!.from("assets").select("*").eq("id", procurement.asset_id).maybeSingle()).data
  const variant = demoMode
    ? getDemoVariant(procurement.variant_id)
    : (await supabase!.from("asset_variants").select("*").eq("id", procurement.variant_id).maybeSingle()).data

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase text-muted-foreground">Stage 2 delivery</p>
          <h1 className="mt-1 text-3xl font-semibold">Procurement</h1>
          <p className="mt-2 text-muted-foreground">
            Created {formatDate(procurement.created_at)} for {formatMoney(procurement.price_cents)}
          </p>
        </div>
        <ProcurementStatus status={procurement.status} />
      </div>

      {procurement.failure_reason ? (
        <div className="mb-6 rounded-lg border border-[#ef9aac] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          {procurement.failure_reason}
        </div>
      ) : null}

      {procurement.status === "delivered" && procurement.pr_url ? (
        <a href={procurement.pr_url} target="_blank" rel="noreferrer" className={buttonVariants()}>
          View pull request
        </a>
      ) : null}

      {procurement.status === "delivered" && procurement.delivery_method === "download" && variant ? (
        <section className="grid gap-5">
          <div className="rounded-lg border border-border bg-panel p-5">
            <h2 className="text-xl font-semibold">{asset?.title ?? "Adapted asset"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{LANGUAGE_LABEL[variant.target_language]}</p>
          </div>
          <CodeBlock title="Adapted source" value={variant.translated_code ?? ""} />
          <CodeBlock title="Adapted tests" value={variant.translated_tests ?? ""} />
        </section>
      ) : null}

      {procurement.status !== "delivered" ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-muted-foreground">
          Delivery is still in progress. Refresh this page for the latest status.
        </div>
      ) : null}

      <Link href="/dashboard" className="mt-8 inline-block text-sm font-medium text-primary underline">
        Back to dashboard
      </Link>
    </main>
  )
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <pre className="max-h-[520px] overflow-auto rounded-lg bg-[var(--code)] p-4 text-xs text-white">
        {value}
      </pre>
    </section>
  )
}
