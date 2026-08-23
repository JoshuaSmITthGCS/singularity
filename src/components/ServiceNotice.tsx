import { AlertTriangle } from "lucide-react"

export function ServiceNotice({
  title = "Backend configuration needed",
  description = "This page needs the Supabase environment variables set before it can load live marketplace data.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded border border-[var(--run-rule)] bg-[var(--run-soft)] p-4">
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--run)]" aria-hidden />
      <div>
        <h2 className="text-sm font-semibold text-[var(--run)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-2">{description}</p>
      </div>
    </div>
  )
}
