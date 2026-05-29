import { Check, Clock, X } from "lucide-react"
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
  if (status === "passed") {
    return (
      <Badge tone="success">
        <Check size={14} aria-hidden />
        {LANGUAGE_LABEL[language]}
      </Badge>
    )
  }

  if (status === "failed") {
    return (
      <Badge tone="danger">
        <X size={14} aria-hidden />
        {LANGUAGE_LABEL[language]}
      </Badge>
    )
  }

  return (
    <Badge tone="warning">
      <Clock size={14} aria-hidden />
      {LANGUAGE_LABEL[language]}
    </Badge>
  )
}
