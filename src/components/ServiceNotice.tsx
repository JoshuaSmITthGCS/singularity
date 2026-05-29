import { AlertTriangle } from "lucide-react"

export function ServiceNotice({
  title = "Backend configuration needed",
  description = "This page needs the Supabase environment variables in Netlify before it can load live marketplace data.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-lg border border-[#dfc27f] bg-[var(--warning-soft)] p-6 text-[var(--warning)]">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} aria-hidden />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6">{description}</p>
        </div>
      </div>
    </div>
  )
}
