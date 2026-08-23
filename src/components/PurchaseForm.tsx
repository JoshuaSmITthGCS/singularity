"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, Download, GitPullRequest, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { LANGUAGE_LABEL } from "@/lib/constants"
import { isDemoMode } from "@/lib/demo-mode"
import type { DeliveryMethod, MarketplaceVariant } from "@/types/database"

type PurchaseResult = {
  procurement: {
    id: string
    status: string
    pr_url: string | null
  }
  download_payload: {
    translated_code: string
    translated_tests: string
    notes_for_pr: string | null
  } | null
}

export function PurchaseForm({
  assetId,
  variants,
}: {
  assetId: string
  variants: MarketplaceVariant[]
}) {
  const demoMode = isDemoMode()
  const passedVariants = variants.filter((variant) => variant.status === "passed")
  const [variantId, setVariantId] = useState(passedVariants[0]?.id ?? "")
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("download")
  const [targetRepo, setTargetRepo] = useState("")
  const [targetBranch, setTargetBranch] = useState("main")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PurchaseResult | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    setResult(null)

    if (demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setLoading(false)
      setResult({
        procurement: {
          id: "30000000-0000-4000-8000-000000000001",
          status: "delivered",
          pr_url:
            deliveryMethod === "github_pr"
              ? "https://github.com/studio/prototype-platformer/pull/42"
              : null,
        },
        download_payload:
          deliveryMethod === "download"
            ? {
                translated_code:
                  "export function ready(frame: number): boolean {\n  return frame >= 6\n}\n",
                translated_tests:
                  "import { describe, expect, it } from 'vitest'\nimport { ready } from './solution'\n\ndescribe('ready', () => {\n  it('verifies the ready window', () => {\n    expect(ready(6)).toBe(true)\n  })\n})\n",
                notes_for_pr: "Demo procurement delivered from the platform.",
              }
            : null,
      })
      return
    }

    const response = await fetch("/api/procurements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset_id: assetId,
        variant_id: variantId,
        delivery_method: deliveryMethod,
        target_repo_full_name: deliveryMethod === "github_pr" ? targetRepo : null,
        target_repo_branch: deliveryMethod === "github_pr" ? targetBranch : null,
      }),
    })

    const payload = await response.json()

    if (!response.ok || payload.error) {
      setLoading(false)
      setError(payload.error ?? "Procurement failed")
      return
    }

    // Real backend returns a Whop checkout URL — send the buyer there to pay.
    // After payment, Whop redirects back to the procurement page and the webhook
    // completes delivery.
    if (payload.data?.checkout_url) {
      window.location.href = payload.data.checkout_url
      return
    }

    setLoading(false)
    setResult(payload.data)
  }

  if (!passedVariants.length) {
    return (
      <div className="rounded border border-dashed border-rule-strong bg-surface p-5 text-sm text-ink-3">
        No verified target is available yet.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded border border-rule bg-surface p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <ShieldCheck size={15} className="text-[var(--pass)]" aria-hidden />
          Buy a verified target
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-3">
          {demoMode
            ? "Only passing targets are selectable. Delivery is simulated in demo mode."
            : "Only targets that passed their tests are selectable."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="variant" className="tag text-ink-4">Verified target</Label>
        <Select
          id="variant"
          value={variantId}
          onChange={(event) => setVariantId(event.target.value)}
        >
          {passedVariants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {LANGUAGE_LABEL[variant.target_language]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <span className="tag block text-ink-4">Delivery</span>
        <div className="grid grid-cols-2 gap-1.5">
          <DeliveryOption
            active={deliveryMethod === "download"}
            onClick={() => setDeliveryMethod("download")}
            icon={<Download size={14} aria-hidden />}
            label="Download"
            hint="Code shown after confirm"
          />
          <DeliveryOption
            active={deliveryMethod === "github_pr"}
            onClick={() => setDeliveryMethod("github_pr")}
            icon={<GitPullRequest size={14} aria-hidden />}
            label="Pull request"
            hint="Opened in your repo"
          />
        </div>
      </div>

      {deliveryMethod === "github_pr" ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div className="space-y-2">
            <Label htmlFor="targetRepo">Target repo</Label>
            <Input
              id="targetRepo"
              value={targetRepo}
              onChange={(event) => setTargetRepo(event.target.value)}
              placeholder="owner/repo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetBranch">Base branch</Label>
            <Input
              id="targetBranch"
              value={targetBranch}
              onChange={(event) => setTargetBranch(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      <Button type="button" onClick={submit} disabled={loading || !variantId}>
        <Check size={16} aria-hidden />
        {loading ? "Delivering" : "Confirm procurement"}
      </Button>

      {error ? <p className="text-sm text-[var(--fail)]">{error}</p> : null}

      {result ? (
        <div className="space-y-4 rounded border border-[var(--pass-rule)] bg-[var(--pass-soft)] p-4">
          <p className="text-sm font-medium">
            {result.procurement.status === "delivered" ? "Procurement delivered." : "Procurement failed."}
          </p>
          <Link
            href={`/procurements/${result.procurement.id}`}
            className="text-sm font-medium text-accent underline"
          >
            Open procurement
          </Link>
          {result.procurement.pr_url ? (
            <a
              href={result.procurement.pr_url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm font-medium text-accent underline"
            >
              View pull request
            </a>
          ) : null}
          {result.download_payload ? (
            <div className="grid gap-3">
              <pre
                tabIndex={0}
                role="region"
                aria-label="Adapted source code"
                className="surface-dark max-h-72 overflow-auto rounded-md bg-[var(--code)] p-4 text-xs text-white"
              >
                {result.download_payload.translated_code}
              </pre>
              <pre
                tabIndex={0}
                role="region"
                aria-label="Adapted tests"
                className="surface-dark max-h-72 overflow-auto rounded-md bg-[var(--code)] p-4 text-xs text-white"
              >
                {result.download_payload.translated_tests}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DeliveryOption({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-2.5 py-2 text-left transition-colors ${
        active
          ? "border-accent bg-[var(--accent-soft)]"
          : "border-rule bg-surface hover:border-rule-strong"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-medium ${active ? "text-accent" : "text-ink"}`}>
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-[0.6875rem] leading-4 text-ink-3">{hint}</span>
    </button>
  )
}
