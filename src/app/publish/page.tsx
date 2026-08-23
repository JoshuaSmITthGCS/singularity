import { AuthButton } from "@/components/AuthButton"
import { Page, PageHeader } from "@/components/PageHeader"
import { PublishForm } from "@/components/PublishForm"
import { ServiceNotice } from "@/components/ServiceNotice"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function PublishPage() {
  const demoMode = isDemoMode()
  let user = demoMode ? { id: "demo-user" } : null

  if (!demoMode) {
    try {
      const supabase = await createClient()
      const response = await supabase.auth.getUser()
      user = response.data.user
    } catch (error) {
      console.error("Publish page auth unavailable", error)

      return (
        <main>
          <Page className="max-w-2xl">
            <ServiceNotice description="Publishing needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY configured." />
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
          title="Publish an asset"
          description="Sign in with GitHub to submit code for verification and listing."
        />
        <Page className="max-w-md">
          <AuthButton signedIn={false} demoMode={demoMode} />
        </Page>
      </main>
    )
  }

  return (
    <main>
      <PageHeader
        eyebrow="Publish"
        title="Publish a verified baseline"
        description={
          demoMode
            ? "Demo mode walks the whole flow without writing to a backend."
            : "Add source and tests, describe it for buyers, then run verification on the original."
        }
      />
      <Page className="max-w-4xl">
        <PublishForm demoMode={demoMode} />
      </Page>
    </main>
  )
}
