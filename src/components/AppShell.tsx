import { SideNav } from "@/components/SideNav"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const demoMode = isDemoMode()
  let signedIn = false

  if (!demoMode) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      signedIn = Boolean(user)
    } catch {
      signedIn = false
    }
  }

  // The rail is sticky at h-dvh, so on a long page its grid column would
  // otherwise show canvas beneath it — paint the column dark.
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr] lg:bg-shell">
      <SideNav signedIn={signedIn} demoMode={demoMode} />
      <div id="main-content" tabIndex={-1} className="min-w-0 bg-canvas">
        {children}
      </div>
    </div>
  )
}
