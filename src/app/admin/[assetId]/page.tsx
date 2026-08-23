import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { EmptyState, Page, PageHeader } from "@/components/PageHeader"
import { ServiceNotice } from "@/components/ServiceNotice"
import { Badge } from "@/components/ui/badge"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { isAdminUser } from "@/lib/admin"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Same admin-only gate as /admin — see that file's header comment.
export default async function AdminAssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>
}) {
  if (isDemoMode()) {
    return (
      <main>
        <PageHeader eyebrow="Admin" title="Asset" />
        <Page className="max-w-2xl">
          <ServiceNotice description="The admin view needs the real backend configured." />
        </Page>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isAdminUser(user?.id)) {
    return (
      <main>
        <PageHeader eyebrow="Admin" title="Asset" />
        <Page className="max-w-md">
          <EmptyState message="This view is restricted to the platform admin account." />
        </Page>
      </main>
    )
  }

  const { assetId } = await params
  const admin = createAdminClient()

  const [{ data: asset }, { data: variants }] = await Promise.all([
    admin
      .from("assets")
      .select("*, profiles(github_username, display_name)")
      .eq("id", assetId)
      .single(),
    admin.from("asset_variants").select("*").eq("asset_id", assetId),
  ])

  if (!asset) notFound()

  const developer = Array.isArray(asset.profiles) ? asset.profiles[0] : asset.profiles

  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title={asset.title}
        description={`Published by ${developer?.github_username ?? developer?.display_name ?? asset.developer_id}`}
        actions={
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            <ArrowLeft size={14} aria-hidden />
            All assets
          </Link>
        }
      />
      <Page className="space-y-6">
        <section>
          <h2 className="tag text-ink-4">
            Source ({LANGUAGE_LABEL[asset.source_language]})
          </h2>
          <pre className="surface-dark mt-2 max-h-96 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]">
            <code>{asset.source_code}</code>
          </pre>
        </section>

        <section>
          <h2 className="tag text-ink-4">Tests</h2>
          <pre className="surface-dark mt-2 max-h-96 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]">
            <code>{asset.test_code}</code>
          </pre>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Translated variants</h2>
          <div className="mt-3 space-y-4">
            {(variants ?? []).map((variant) => (
              <div key={variant.id} className="rounded border border-rule bg-surface p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="mono text-sm text-ink">{LANGUAGE_LABEL[variant.target_language]}</span>
                  <Badge
                    tone={
                      variant.status === "passed"
                        ? "pass"
                        : variant.status === "failed"
                          ? "fail"
                          : "run"
                    }
                  >
                    {variant.status}
                  </Badge>
                </div>
                {variant.tests_total !== null ? (
                  <p className="mono tabular mt-1 text-xs text-ink-3">
                    {variant.tests_passed}/{variant.tests_total} tests passed
                  </p>
                ) : null}
                {variant.translated_code ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-accent">View translated code + tests</summary>
                    <pre className="surface-dark mt-2 max-h-72 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]">
                      <code>{variant.translated_code}</code>
                    </pre>
                    {variant.translated_tests ? (
                      <pre className="surface-dark mt-2 max-h-72 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]">
                        <code>{variant.translated_tests}</code>
                      </pre>
                    ) : null}
                  </details>
                ) : null}
                {variant.test_output ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-accent">View test output</summary>
                    <pre className="mt-2 max-h-56 overflow-auto rounded border border-rule bg-sunken p-3 text-xs leading-5 text-ink-2">
                      {variant.test_output}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </Page>
    </main>
  )
}
