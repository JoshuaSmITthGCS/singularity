import { LANGUAGES, LANGUAGE_LABEL } from "@/lib/constants"
import type { Language, VariantStatus } from "@/types/database"

// The marketplace and dashboard hand us different variant shapes; both carry
// enough to render a run row.
export type VerifiableVariant = {
  target_language: Language
  status: VariantStatus
  tests_total?: number | null
  tests_passed?: number | null
  tests_failed?: number | null
}

const DOT: Record<"pass" | "run" | "fail", string> = {
  pass: "bg-[var(--pass)]",
  run: "bg-[var(--run)]",
  fail: "bg-[var(--fail)]",
}

function toneOf(status?: VariantStatus | null) {
  if (status === "passed") return "pass" as const
  if (status === "failed") return "fail" as const
  return "run" as const
}

export function StatusDot({ status }: { status?: VariantStatus | null }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[toneOf(status)]}`} aria-hidden />
}

/**
 * The product's whole claim is "these tests actually ran and passed in your
 * language", so the run log is the primary object on any surface describing an
 * asset — not a row of decorative badges. Reads like a CI checks panel.
 */
export function VerificationMatrix({
  variants,
  sourceLanguage,
  className = "",
}: {
  variants: VerifiableVariant[]
  sourceLanguage?: Language
  className?: string
}) {
  const byLanguage = new Map<Language, VerifiableVariant>()
  variants.forEach((variant) => byLanguage.set(variant.target_language, variant))
  const passed = variants.filter((variant) => variant.status === "passed").length

  return (
    <div className={`overflow-hidden rounded border border-rule bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-rule bg-sunken px-3 py-2">
        <h3 className="tag text-ink-3">Verification</h3>
        <p className="tabular text-xs text-ink-2">
          <span className="font-medium text-ink">{passed}</span> of {LANGUAGES.length} targets
          passing
        </p>
      </div>
      <ul className="divide-y divide-rule">
        {LANGUAGES.map((language) => {
          const variant = byLanguage.get(language)
          const isSource = language === sourceLanguage

          return (
            <li key={language} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <StatusDot status={variant?.status} />
              <span className="mono text-[0.8125rem] text-ink">{LANGUAGE_LABEL[language]}</span>
              {isSource ? (
                <span className="tag rounded border border-rule px-1 py-px text-ink-4">source</span>
              ) : null}
              <span className="ml-auto">
                <RunResult variant={variant} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Naming the actual pipeline phase beats a generic spinner label: a buyer
// waiting on a target can tell translation from test execution.
const IN_PROGRESS: Partial<Record<VariantStatus, string>> = {
  queued: "queued",
  translating: "translating…",
  testing: "running tests…",
}

function RunResult({ variant }: { variant?: VerifiableVariant }) {
  const phase = variant ? IN_PROGRESS[variant.status] : "queued"
  if (!variant || phase) {
    return <span className="mono text-xs text-[var(--run)]">{phase ?? "queued"}</span>
  }

  const total = variant.tests_total ?? null
  const passedCount = variant.tests_passed ?? null

  if (variant.status === "passed") {
    return (
      <span className="mono tabular text-xs text-[var(--pass)]">
        {total !== null ? `${passedCount ?? total}/${total} passed` : "passed"}
      </span>
    )
  }

  return (
    <span className="mono tabular text-xs text-[var(--fail)]">
      {total !== null ? `${passedCount ?? 0}/${total} passed` : "failed"}
    </span>
  )
}

/**
 * Compact inline form for list rows, where a full panel would crowd the row but
 * the pass/fail spread still needs to be legible at a glance.
 */
export function VerificationStrip({
  variants,
  sourceLanguage,
}: {
  variants: VerifiableVariant[]
  sourceLanguage?: Language
}) {
  const byLanguage = new Map<Language, VerifiableVariant>()
  variants.forEach((variant) => byLanguage.set(variant.target_language, variant))

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {LANGUAGES.map((language) => {
        const variant = byLanguage.get(language)
        const tone = toneOf(variant?.status)
        const label =
          variant?.status === "passed"
            ? "passed"
            : variant?.status === "failed"
              ? "failed"
              : (variant && IN_PROGRESS[variant.status]) ?? "queued"

        return (
          <li
            key={language}
            title={`${LANGUAGE_LABEL[language]} — ${label}`}
            className={`tag inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 ${
              tone === "pass"
                ? "border-[var(--pass-rule)] bg-[var(--pass-soft)] text-[var(--pass)]"
                : tone === "fail"
                  ? "border-[var(--fail-rule)] bg-[var(--fail-soft)] text-[var(--fail)]"
                  : "border-[var(--run-rule)] bg-[var(--run-soft)] text-[var(--run)]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
            {LANGUAGE_LABEL[language]}
            {language === sourceLanguage ? <span className="opacity-60">·src</span> : null}
            <span className="sr-only">{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
