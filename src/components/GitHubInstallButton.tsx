"use client"

import { PlugZap } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// demoMode comes from the server — see AuthButton.tsx for why this can't
// safely call isDemoMode() itself from a client component.
export function GitHubInstallButton({ demoMode }: { demoMode: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function install() {
    if (demoMode) {
      setError("Demo mode: GitHub installation is simulated.")
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch("/api/github/install")
    const payload = await response.json()

    if (!response.ok || payload.error) {
      setLoading(false)
      setError(payload.error ?? "GitHub setup failed")
      return
    }

    window.location.href = payload.data.url
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={install} disabled={loading}>
        <PlugZap size={16} aria-hidden />
        {demoMode ? "Demo GitHub App" : loading ? "Opening GitHub" : "Install GitHub App"}
      </Button>
      {error ? <p className="text-sm text-[var(--fail)]">{error}</p> : null}
    </div>
  )
}
