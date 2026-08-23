"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"

// Starts developer payment onboarding: creates a connected Whop company (once)
// and redirects to Whop's hosted KYC flow. Once complete, the developer's
// assets can be sold and earnings land in their connected balance.
export function WhopConnectButton({
  connected,
  className,
}: {
  connected: boolean
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/whop/connect", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not start onboarding")
        setLoading(false)
        return
      }
      window.location.href = payload.data.url
    } catch {
      setError("Network error")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={start} disabled={loading} className={className}>
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Wallet size={16} aria-hidden />}
        {connected ? "Continue payment setup" : "Set up payouts"}
      </Button>
      {error ? <p className="text-sm text-[var(--fail)]">{error}</p> : null}
    </div>
  )
}
