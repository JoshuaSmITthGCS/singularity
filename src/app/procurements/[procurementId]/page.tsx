import Link from "next/link"
import { notFound } from "next/navigation"
import { Page, PageHeader } from "@/components/PageHeader"
import { ProcurementStatus } from "@/components/ProcurementStatus"
import { ServiceNotice } from "@/components/ServiceNotice"
import { GitPullRequest } from "lucide-react"
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
        <main>
          <Page className="max-w-2xl">
            <ServiceNotice description="Procurement details need Supabase runtime environment variables configured." />
          </Page>
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
    <main>
      <PageHeader
        eyebrow="Procure"
        title={asset?.title ?? "Delivery"}
        description={
          <span className="tabular">
            {variant ? `${LANGUAGE_LABEL[variant.target_language]} · ` : ""}
            {formatDate(procurement.created_at)} · {formatMoney(procurement.price_cents)}
          </span>
        }
        actions={<ProcurementStatus status={procurement.status} />}
      />

      <Page className="max-w-4xl space-y-5">
        {procurement.failure_reason ? (
          <div className="rounded border border-[var(--fail-rule)] bg-[var(--fail-soft)] p-3.5 text-sm leading-6 text-[var(--fail)]">
            {procurement.failure_reason}
          </div>
        ) : null}

        {procurement.status === "delivered" && procurement.pr_url ? (
          <a
            href={procurement.pr_url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            <GitPullRequest size={14} aria-hidden />
            View pull request
          </a>
        ) : null}

        {procurement.status === "delivered" && procurement.delivery_method === "download" && variant ? (
          <>
            <CodeBlock title="Adapted source" value={variant.translated_code ?? ""} />
            <CodeBlock title="Adapted tests" value={variant.translated_tests ?? ""} />
          </>
        ) : null}

        {procurement.status !== "delivered" ? (
          <div className="rounded border border-dashed border-rule-strong bg-surface px-6 py-10 text-center text-sm text-ink-3">
            Delivery is still in progress. Refresh for the latest status.
          </div>
        ) : null}

        <Link href="/dashboard" className="inline-block text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </Page>
    </main>
  )
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="overflow-hidden rounded border border-rule">
      <h2 className="tag border-b border-rule bg-sunken px-3 py-2 text-ink-3">{title}</h2>
      <pre
        tabIndex={0}
        role="region"
        aria-label={title}
        className="surface-dark max-h-[32rem] overflow-auto bg-code p-4 text-xs leading-6 text-[#e8e8e5]"
      >
        {value}
      </pre>
    </section>
  )
}
