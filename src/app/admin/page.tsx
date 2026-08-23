import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { EmptyState, Page, PageHeader } from "@/components/PageHeader"
import { ServiceNotice } from "@/components/ServiceNotice"
import { Badge } from "@/components/ui/badge"
import { isAdminUser } from "@/lib/admin"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { formatDate, formatMoney } from "@/lib/utils"

export const dynamic = "force-dynamic"

// Restricted to ADMIN_USER_ID — every asset on the platform, including
// private source_code/test_code, regardless of who published it or whether
// it's published yet. Uses the admin (service role) client deliberately:
// this is the one place RLS's per-developer/per-buyer visibility is meant
// to be bypassed, gated instead by the page-level check below.
export default async function AdminPage() {
  if (isDemoMode()) {
    return (
      <main>
        <PageHeader eyebrow="Admin" title="All assets" />
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
        <PageHeader eyebrow="Admin" title="All assets" />
        <Page className="max-w-md">
          <EmptyState message="This view is restricted to the platform admin account." />
        </Page>
      </main>
    )
  }

  const admin = createAdminClient()
  const { data: assets } = await admin
    .from("assets")
    .select("id, title, source_language, status, price_cents, complexity, is_demo_sample, created_at, developer_id, profiles(github_username, display_name)")
    .order("created_at", { ascending: false })

  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="All assets"
        description="Every asset published on the platform, across every developer — full source visible, not gated behind a purchase."
      />
      <Page>
        {assets?.length ? (
          <div className="overflow-hidden rounded border border-rule bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rule bg-sunken text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Developer</th>
                  <th className="px-3 py-2 font-medium">Language</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  // Supabase's PostgREST join comes back as an object for a
                  // to-one relationship, but the generated type can't express
                  // that distinction — narrow it defensively.
                  const developer = Array.isArray(asset.profiles) ? asset.profiles[0] : asset.profiles

                  return (
                    <tr key={asset.id} className="border-t border-rule">
                      <td className="px-3 py-2 font-medium text-ink">
                        {asset.title}
                        {asset.is_demo_sample ? (
                          <span className="tag ml-2 rounded border border-rule px-1 py-px text-ink-4">
                            demo sample
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-ink-2">
                        {developer?.github_username ?? developer?.display_name ?? asset.developer_id.slice(0, 8)}
                      </td>
                      <td className="mono px-3 py-2 text-xs text-ink-2">{asset.source_language}</td>
                      <td className="px-3 py-2">
                        <Badge tone={asset.status === "published" ? "pass" : "run"}>{asset.status}</Badge>
                      </td>
                      <td className="mono tabular px-3 py-2 text-ink-2">{formatMoney(asset.price_cents)}</td>
                      <td className="px-3 py-2 text-ink-3">{formatDate(asset.created_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/${asset.id}`}
                          className="inline-flex items-center gap-0.5 text-accent hover:underline"
                        >
                          View source
                          <ChevronRight size={14} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No assets published yet." />
        )}
      </Page>
    </main>
  )
}
