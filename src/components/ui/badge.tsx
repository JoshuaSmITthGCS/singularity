import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeTone = "neutral" | "pass" | "run" | "fail" | "accent"

// Tones map to verification state, so they carry meaning and shouldn't be
// picked for looks. `neutral` is the only decorative one.
const tones: Record<BadgeTone, string> = {
  neutral: "border-rule bg-sunken text-ink-3",
  pass: "border-[var(--pass-rule)] bg-[var(--pass-soft)] text-[var(--pass)]",
  run: "border-[var(--run-rule)] bg-[var(--run-soft)] text-[var(--run)]",
  fail: "border-[var(--fail-rule)] bg-[var(--fail-soft)] text-[var(--fail)]",
  accent: "border-[var(--accent-rule)] bg-[var(--accent-soft)] text-[var(--accent)]",
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "tag inline-flex items-center gap-1 rounded-full border px-2 py-0.5 leading-5",
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
