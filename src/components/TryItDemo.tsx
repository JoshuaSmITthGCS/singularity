"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, ShoppingCart, Sparkles } from "lucide-react"
import { LanguageBadge } from "@/components/LanguageBadge"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { DEMO_SNIPPETS } from "@/lib/demo-walkthrough"
import { formatMoney } from "@/lib/utils"
import type { Language, VariantStatus } from "@/types/database"

type DemoVariant = {
  target_language: Language
  status: VariantStatus
  tests_total: number | null
  tests_passed: number | null
  tests_failed: number | null
}

type DemoAssetStatus = {
  asset: { id: string; title: string; status: string; source_language: Language }
  variants: DemoVariant[]
}

const STATUS_LABEL: Record<VariantStatus, string> = {
  queued: "Queued",
  translating: "Translating with Claude…",
  testing: "Running in Docker…",
  passed: "Passed",
  failed: "Failed",
}

// Rough position through the pipeline, purely for the progress bar's fill —
// not a real percentage of work done, just enough to show forward motion.
const STAGE_PERCENT: Record<VariantStatus, number> = {
  queued: 8,
  translating: 45,
  testing: 75,
  passed: 100,
  failed: 100,
}

const STAGE_TONE: Record<VariantStatus, "run" | "pass" | "fail"> = {
  queued: "run",
  translating: "run",
  testing: "run",
  passed: "pass",
  failed: "fail",
}

function ProgressBar({ status }: { status: VariantStatus }) {
  const tone = STAGE_TONE[status]
  const color =
    tone === "pass" ? "var(--pass)" : tone === "fail" ? "var(--fail)" : "var(--run)"

  return (
    <div
      role="progressbar"
      aria-valuenow={STAGE_PERCENT[status]}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={STATUS_LABEL[status]}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${STAGE_PERCENT[status]}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function TryItDemo() {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <SellerDemo />
      <BuyerDemo />
    </div>
  )
}

function SellerDemo() {
  const [snippetId, setSnippetId] = useState(DEMO_SNIPPETS[0].id)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [status, setStatus] = useState<DemoAssetStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Liveness proof: a static spinner is indistinguishable from a fake one,
  // especially during the first few seconds before the worker's own poll
  // loop claims the job. A ticking elapsed clock and a rising check count
  // can only move if a real request is actually landing.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [now, setNow] = useState<number | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const snippet = DEMO_SNIPPETS.find((s) => s.id === snippetId) ?? DEMO_SNIPPETS[0]

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [])

  async function run() {
    setLoading(true)
    setError(null)
    setStatus(null)
    setCheckCount(0)
    const startTime = Date.now()
    setStartedAt(startTime)
    setLastCheckedAt(null)
    setNow(startTime)

    if (clockRef.current) clearInterval(clockRef.current)
    clockRef.current = setInterval(() => setNow(Date.now()), 1000)

    try {
      const response = await fetch("/api/demo/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snippetId }),
      })
      const payload = await response.json()

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not start the demo")
        setLoading(false)
        if (clockRef.current) clearInterval(clockRef.current)
        return
      }

      setAssetId(payload.data.assetId)
      poll(payload.data.assetId)
    } catch {
      setError("Network error")
      setLoading(false)
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }

  function poll(id: string) {
    const tick = async () => {
      try {
        const response = await fetch(`/api/demo/assets/${id}`)
        const payload = await response.json()
        if (!response.ok || payload.error) return
        setStatus(payload.data)
        setLastCheckedAt(Date.now())
        setCheckCount((count) => count + 1)

        const done = (payload.data.variants as DemoVariant[]).every(
          (v) => v.status === "passed" || v.status === "failed"
        )
        if (done) {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          if (clockRef.current) {
            clearInterval(clockRef.current)
            clockRef.current = null
          }
          setLoading(false)
        }
      } catch {
        // transient — next tick retries
      }
    }

    tick()
    pollRef.current = setInterval(tick, 3000)
  }

  const allQueued = status?.variants.every((v) => v.status === "queued") ?? false
  const elapsedSeconds = startedAt && now ? Math.floor((now - startedAt) / 1000) : 0

  return (
    <section className="rounded border border-rule bg-surface p-5">
      <div className="flex items-center gap-2 text-accent">
        <Sparkles size={18} aria-hidden />
        <h2 className="display text-lg text-ink">Try it as a seller</h2>
      </div>
      <p className="mt-2 text-sm text-ink-3">
        Pick a sample snippet and publish it for real — Claude translates it into every supported
        language, then each variant runs in an isolated Docker sandbox. Nothing here is
        pre-recorded; you&rsquo;re watching the actual verification pipeline.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {DEMO_SNIPPETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => !loading && setSnippetId(s.id)}
            disabled={loading}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              s.id === snippetId
                ? "border-accent bg-accent/10 text-accent"
                : "border-rule text-ink-3 hover:border-[#aac6bb]"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <pre
        tabIndex={0}
        role="region"
        aria-label="Sample source"
        className="surface-dark mt-4 max-h-64 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]"
      >
        <code>{snippet.source_code}</code>
      </pre>

      <Button type="button" onClick={run} disabled={loading} className="mt-4">
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
        {loading ? "Running the real pipeline…" : "Publish & watch it verify"}
      </Button>

      {error && <p className="mt-3 text-sm text-[var(--fail)]">{error}</p>}

      {status && (
        <div className="mt-5 space-y-3 border-t border-rule pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-3">
              Translating {LANGUAGE_LABEL[status.asset.source_language]} source into every target
              language — this typically takes 1–3 minutes.
            </p>
            {/* Proof this is live, not a decorative spinner: the clock and
                check count can only move if real requests are landing. */}
            <p className="mono tabular text-xs text-ink-4">
              {elapsedSeconds}s elapsed · checked {checkCount}×
              {lastCheckedAt ? ` · last check ${Math.max(0, Math.floor(((now ?? Date.now()) - lastCheckedAt) / 1000))}s ago` : ""}
            </p>
          </div>
          {allQueued && elapsedSeconds > 8 && (
            <p className="rounded border border-[var(--run-rule)] bg-[var(--run-soft)] px-2.5 py-1.5 text-xs text-[var(--run)]">
              Still queued — waiting for the worker process to claim this job. If it stays queued
              past ~30s, the worker may be offline.
            </p>
          )}
          <div className="grid gap-2.5">
            {status.variants.map((v) => (
              <div key={v.target_language} className="rounded-md border border-rule px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <LanguageBadge language={v.target_language} status={v.status} />
                  <span className="text-xs text-ink-3">
                    {STATUS_LABEL[v.status]}
                    {v.status === "passed" && v.tests_total != null
                      ? ` · ${v.tests_passed}/${v.tests_total} tests`
                      : ""}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar status={v.status} />
                </div>
              </div>
            ))}
          </div>
          {status.asset.status === "published" && (
            <p className="flex items-center gap-1.5 text-sm text-[var(--pass)]">
              <CheckCircle2 size={16} aria-hidden />
              Published — verified and live in the marketplace.
            </p>
          )}
        </div>
      )}

      {assetId && (
        <a
          href={`/marketplace/${assetId}`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}
        >
          View this asset&rsquo;s real listing
        </a>
      )}
    </section>
  )
}

type BuyerListItem = {
  id: string
  title: string
  short_description: string
  source_language: Language
  price_cents: number
}

function BuyerDemo() {
  const [assets, setAssets] = useState<BuyerListItem[] | null>(null)
  const [selected, setSelected] = useState<BuyerListItem | null>(null)
  const [reveal, setReveal] = useState<{ code: string; tests: string; notes: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/demo/assets")
      .then((r) => r.json())
      .then((payload) => setAssets(payload?.data?.assets ?? []))
      .catch(() => setAssets([]))
  }, [])

  async function buy(asset: BuyerListItem, targetLanguage: Language) {
    setSelected(asset)
    setReveal(null)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/demo/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, targetLanguage }),
      })
      const payload = await response.json()

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not complete the demo purchase")
        setLoading(false)
        return
      }

      setReveal(payload.data)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded border border-rule bg-surface p-5">
      <div className="flex items-center gap-2 text-accent">
        <ShoppingCart size={18} aria-hidden />
        <h2 className="display text-lg text-ink">Try it as a buyer</h2>
      </div>
      <p className="mt-2 text-sm text-ink-3">
        This is a walkthrough, not a real charge — no card, no Whop checkout. It shows exactly
        what a buyer receives after purchase: real verified code, delivered instantly.
      </p>

      {assets === null && <p className="mt-4 text-sm text-ink-3">Loading…</p>}

      {assets?.length === 0 && (
        <p className="mt-4 text-sm text-ink-3">
          No verified demo assets yet — run the seller demo on the left first, then come back here
          once it&rsquo;s published.
        </p>
      )}

      <div className="mt-4 grid gap-3">
        {assets?.map((asset) => (
          <div key={asset.id} className="rounded-md border border-rule p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{asset.title}</p>
                <p className="mt-1 text-sm text-ink-3">{asset.short_description}</p>
              </div>
              <Badge className="mono tabular">{formatMoney(asset.price_cents)}</Badge>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={loading}
              onClick={() => buy(asset, asset.source_language)}
            >
              <ShoppingCart size={14} aria-hidden />
              Buy (demo) — {LANGUAGE_LABEL[asset.source_language]}
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--fail)]">{error}</p>}

      {selected && reveal && (
        <div className="mt-5 space-y-2 border-t border-rule pt-4">
          <p className="flex items-center gap-1.5 text-sm text-[var(--pass)]">
            <CheckCircle2 size={16} aria-hidden />
            Delivered — this is the real verified code for {selected.title}.
          </p>
          <pre
            tabIndex={0}
            role="region"
            aria-label="Delivered code"
            className="surface-dark max-h-64 overflow-auto rounded border border-rule bg-code p-3 text-xs leading-5 text-[#e8e8e5]"
          >
            <code>{reveal.code}</code>
          </pre>
          <p className="text-xs text-ink-3">
            A real purchase delivers this via GitHub PR or direct download, and splits payment
            70/25/5 between developer, platform, and referral reserve through Whop.
          </p>
        </div>
      )}
    </section>
  )
}
