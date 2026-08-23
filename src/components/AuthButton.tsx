"use client"

import { useRouter } from "next/navigation"
import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

// demoMode comes from the server (isDemoMode() checks SINGULARITY_REAL_BACKEND,
// which has no NEXT_PUBLIC_ prefix and is never inlined into client bundles —
// calling isDemoMode() from client code always reads it as demo mode).
export function AuthButton({ signedIn, demoMode }: { signedIn: boolean; demoMode: boolean }) {
  const router = useRouter()

  async function signIn() {
    if (demoMode) {
      router.push("/dashboard")
      return
    }

    const supabase = createClient()
    const origin = window.location.origin

    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })
  }

  async function signOut() {
    if (demoMode) {
      router.push("/")
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  // Lives on the dark nav rail, so it uses the shell variant rather than the
  // light-surface defaults.
  if (signedIn) {
    return (
      <Button type="button" variant="shell" size="sm" className="w-full" onClick={signOut}>
        <LogOut size={14} aria-hidden />
        Sign out
      </Button>
    )
  }

  return (
    <Button type="button" variant="shell" size="sm" className="w-full" onClick={signIn}>
      <LogIn size={14} aria-hidden />
      {demoMode ? "Enter demo" : "Sign in with GitHub"}
    </Button>
  )
}
