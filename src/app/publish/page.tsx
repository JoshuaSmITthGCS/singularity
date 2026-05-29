import { AuthButton } from "@/components/AuthButton"
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
        <main className="mx-auto max-w-3xl px-4 py-10">
          <ServiceNotice description="Publishing needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY configured in Netlify." />
        </main>
      )
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-border bg-panel p-8">
          <p className="text-sm font-medium uppercase text-muted-foreground">Creator onboarding</p>
          <h1 className="mt-1 text-3xl font-semibold">Publish an asset</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in with GitHub to submit code for Stage 1 verification and marketplace listing.
          </p>
          <div className="mt-5">
            <AuthButton signedIn={false} />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase text-muted-foreground">Developer upload</p>
          <h1 className="mt-1 text-3xl font-semibold">Publish a verified baseline</h1>
          <p className="mt-2 text-muted-foreground">
            {demoMode
              ? "Demo mode lets you walk through publishing without writing to a backend."
              : "Add source and tests, write the public summary, then run Stage 1 verification on the original asset."}
          </p>
        </div>
        <div className="rounded-lg border border-[#9dbed0] bg-[var(--info-soft)] p-4 text-sm text-[var(--info)]">
          {demoMode
            ? "Submissions are simulated locally. Set NEXT_PUBLIC_REAL_BACKEND=true to use Supabase."
            : "Repo linking and paste mode both feed the same verification pipeline."}
        </div>
      </div>
      <PublishForm />
    </main>
  )
}
