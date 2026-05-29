"use client"

import { useRouter } from "next/navigation"
import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/client"

export function AuthButton({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  const demoMode = isDemoMode()

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

  if (signedIn) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={signOut}>
        <LogOut size={16} aria-hidden />
        Sign out
      </Button>
    )
  }

  return (
    <Button type="button" size="sm" onClick={signIn}>
      <LogIn size={16} aria-hidden />
      {demoMode ? "Demo dashboard" : "Sign in"}
    </Button>
  )
}
