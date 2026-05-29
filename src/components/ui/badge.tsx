import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-[#96cdbd] bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-[#dfc27f] bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "border-[#ef9aac] bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "border-[#9dbed0] bg-[var(--info-soft)] text-[var(--info)]",
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
