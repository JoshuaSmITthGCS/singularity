"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LANGUAGE_LABEL } from "@/lib/constants"
import type { Language } from "@/types/database"

type RequestState = "idle" | "requesting" | "queued" | "error"

// On-demand translation: languages that were never requested have no variant.
// This button queues one; the worker translates and verifies it, and the badge
// flips to verified once tests pass.
export function RequestVariantButton({
  assetId,
  language,
}: {
  assetId: string
  language: Language
}) {
  const router = useRouter()
  const [state, setState] = useState<RequestState>("idle")
  const [message, setMessage] = useState<string | null>(null)

  async function requestVariant() {
    setState("requesting")
    setMessage(null)

    try {
      const response = await fetch(`/api/assets/${assetId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setState("error")
        setMessage(payload?.error ?? "Could not request this language")
        return
      }

      setState("queued")
      setMessage("Queued for verified translation")
      router.refresh()
    } catch {
      setState("error")
      setMessage("Could not request this language")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={requestVariant}
        disabled={state === "requesting" || state === "queued"}
      >
        <Languages size={14} aria-hidden />
        {state === "requesting"
          ? "Requesting…"
          : state === "queued"
            ? `${LANGUAGE_LABEL[language]} queued`
            : `Request ${LANGUAGE_LABEL[language]}`}
      </Button>
      {message ? (
        <span className={`text-xs ${state === "error" ? "text-danger" : "text-muted-foreground"}`}>
          {message}
        </span>
      ) : null}
    </div>
  )
}
