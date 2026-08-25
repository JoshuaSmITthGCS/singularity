import { EmptyState, Page, PageHeader, Panel } from "@/components/PageHeader"
import { ServiceNotice } from "@/components/ServiceNotice"
import { WakePcButton } from "@/components/WakePcButton"
import { isAdminUser } from "@/lib/admin"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Personal utility bolted onto the site for one use case: wake a home PC
// for a live demo while traveling. Not part of the marketplace product —
// restricted to ADMIN_USER_ID the same way /admin is.
export default async function WakeOnLanPage() {
  if (isDemoMode()) {
    return (
      <main>
        <PageHeader eyebrow="Utility" title="Wake PC" />
        <Page className="max-w-2xl">
          <ServiceNotice description="Wake-on-LAN needs the real backend configured." />
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
        <PageHeader eyebrow="Utility" title="Wake PC" />
        <Page className="max-w-md">
          <EmptyState message="This page is restricted to the platform admin account." />
        </Page>
      </main>
    )
  }

  return (
    <main>
      <PageHeader
        eyebrow="Utility"
        title="Wake PC"
        description="Send a Wake-on-LAN magic packet to the home machine configured via WOL_TARGET_HOST/PORT/MAC."
      />
      <Page className="max-w-md">
        <Panel title="Remote wake">
          <p className="mb-4 text-sm leading-6 text-ink-2">
            Requires the home router to forward the configured UDP port to its
            local broadcast address — see docs/PRODUCTION_SETUP.md.
          </p>
          <WakePcButton />
        </Panel>
      </Page>
    </main>
  )
}
