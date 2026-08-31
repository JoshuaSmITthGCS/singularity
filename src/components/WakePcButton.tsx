"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Power } from "lucide-react"

export function WakePcButton() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const wake = async () => {
    setState("loading")
    setError(null)
    try {
      const response = await fetch("/api/wol", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not send the wake packet")
        setState("idle")
        return
      }
      setState("sent")
    } catch {
      setError("Network error")
      setState("idle")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={wake} disabled={state === "loading"}>
        {state === "loading" ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : state === "sent" ? (
          <CheckCircle2 size={16} aria-hidden />
        ) : (
          <Power size={16} aria-hidden />
        )}
        {state === "sent" ? "Packet sent" : "Wake PC"}
      </Button>
      {error ? <p className="text-sm text-[var(--fail)]">{error}</p> : null}
      {state === "sent" ? (
        <p className="text-sm text-ink-3">
          Give it a minute or two to boot, then check it&rsquo;s reachable.
        </p>
      ) : null}
    </div>
  )
}
