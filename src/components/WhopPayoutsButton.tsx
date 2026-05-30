"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, Wallet } from "lucide-react"

// Opens Whop's hosted payout portal for the developer's connected company,
// where they withdraw their earned balance.
export function WhopPayoutsButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/whop/payouts", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not open payouts portal")
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
      <Button type="button" variant="outline" onClick={open} disabled={loading} className={className}>
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Wallet size={16} aria-hidden />}
        Manage payouts
        <ExternalLink size={14} aria-hidden />
      </Button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
}
