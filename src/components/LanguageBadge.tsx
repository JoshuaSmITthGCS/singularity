import { Badge } from "@/components/ui/badge"
import { LANGUAGE_LABEL } from "@/lib/constants"
import type { Language, VariantStatus } from "@/types/database"

export function LanguageBadge({
  language,
  status,
}: {
  language: Language
  status?: VariantStatus | null
}) {
  const tone = status === "passed" ? "pass" : status === "failed" ? "fail" : "run"
  const label = status === "passed" ? "passed" : status === "failed" ? "failed" : "in progress"

  return (
    <Badge tone={tone}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "pass" ? "bg-[var(--pass)]" : tone === "fail" ? "bg-[var(--fail)]" : "bg-[var(--run)]"
        }`}
        aria-hidden
      />
      {LANGUAGE_LABEL[language]}
      <span className="sr-only">{label}</span>
    </Badge>
  )
}
