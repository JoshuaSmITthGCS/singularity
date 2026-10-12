"use client"

import { useMemo, useState } from "react"
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Panel } from "@/components/PageHeader"
import {
  evaluateScenario,
  recordCompleteness,
  toJsonl,
  type ComponentProvenance,
  type DecisionRecord,
  type Layout,
  type Scenario,
} from "@/lib/pilot-demo"
import { decisionRecordSchema } from "@/lib/validation"
import { formatMoney } from "@/lib/utils"

const ROLES = [
  ["process_engineer", "Process engineer"],
  ["operator", "Operator"],
  ["supervisor", "Supervisor"],
  ["other", "Other"],
] as const

// Status colors encode verification state, so live/planned uses accent/neutral.
function Status({ live }: { live: boolean }) {
  return <Badge tone={live ? "accent" : "neutral"}>{live ? "Live" : "Planned"}</Badge>
}

function LayoutMap({ layout, highlight }: { layout: Layout; highlight: boolean }) {
  const xs = layout.stations.map((s) => s.x)
  const ys = layout.stations.map((s) => s.y)
  const maxX = Math.max(...xs, 1)
  const maxY = Math.max(...ys, 1)
  const w = 260
  const h = 96
  const px = (x: number) => 32 + (x / maxX) * (w - 64)
  const py = (y: number) => 24 + (y / maxY) * (h - 48)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${layout.label} station map`} className="w-full">
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx="3" fill="none" stroke="currentColor" className={highlight ? "text-ink-2" : "text-rule"} />
      {layout.stations.map((s) => (
        <g key={s.id}>
          <circle cx={px(s.x)} cy={py(s.y)} r="5" className="fill-ink-2" />
          <text x={px(s.x)} y={py(s.y) - 8} textAnchor="middle" fontSize="8" className="fill-ink-3">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function PilotDemo({
  scenarios,
  manifest,
  contributorSharePct,
  flowCostSource,
  flowCostAdaptedSource,
}: {
  scenarios: Scenario[]
  manifest: ComponentProvenance[]
  contributorSharePct: number
  flowCostSource: string
  flowCostAdaptedSource: string
}) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]
  const outcomes = useMemo(() => evaluateScenario(scenario), [scenario])

  const [chosen, setChosen] = useState("")
  const [role, setRole] = useState<string>("process_engineer")
  const [rationale, setRationale] = useState("")
  const [feedback, setFeedback] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<DecisionRecord[]>([])

  function changeScenario(id: string) {
    setScenarioId(id)
    setChosen("")
    setError(null)
  }

  function capture() {
    const parsed = decisionRecordSchema.safeParse({
      scenario_id: scenario.id,
      participant_role: role,
      chosen_layout_id: chosen,
      alternatives_considered: scenario.layouts.map((l) => l.id).filter((id) => id !== chosen),
      rationale,
      reviewer_feedback: feedback || undefined,
      consent_recorded: consent,
    })
    if (!parsed.success) {
      setError("Pick a layout and give a rationale before capturing.")
      return
    }
    const outcome = outcomes.find((o) => o.layoutId === parsed.data.chosen_layout_id)
    if (!outcome) {
      setError("Pick a layout before capturing.")
      return
    }
    setError(null)
    setRecords((prev) => [
      ...prev,
      {
        ...parsed.data,
        record_id: `rec-${prev.length + 1}`,
        captured_at: new Date().toISOString(),
        state: { flows: scenario.flows, baseline_layout_id: scenario.baselineLayoutId },
        outcome,
        component_ids: manifest.map((m) => m.id),
      },
    ])
    setRationale("")
    setFeedback("")
  }

  function download() {
    const blob = new Blob([toJsonl(records)], { type: "application/x-ndjson" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "decision-records.jsonl"
    a.click()
    URL.revokeObjectURL(url)
  }

  const avgCompleteness = records.length
    ? records.reduce((sum, r) => sum + recordCompleteness(r), 0) / records.length
    : null

  return (
    <div className="grid gap-5">
      <Panel title="1 · Component source" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          Components arrive with a content hash, a version, and any customer adaptation. These two are
          demo fixtures written for this walkthrough, not a real contributor&apos;s repository.
        </p>
        <ul className="mt-3 grid gap-3">
          {manifest.map((c) => (
            <li key={c.id} className="rounded border border-rule bg-sunken p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono font-medium text-ink">{c.name}@{c.version}</span>
                <span className="tag text-ink-4">{c.origin}</span>
              </div>
              <dl className="mono mt-2 grid gap-1 text-xs text-ink-3">
                <div>sha256 {c.content_hash.slice(0, 16)}…</div>
                {c.adapted_hash ? <div>adapted sha256 {c.adapted_hash.slice(0, 16)}…</div> : null}
              </dl>
              {c.adaptation_note ? <p className="mt-2 text-ink-2">{c.adaptation_note}</p> : null}
            </li>
          ))}
        </ul>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-3">Show the adaptation diff target</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <pre className="mono overflow-x-auto rounded border border-rule bg-sunken p-3 text-xs">{flowCostSource}</pre>
            <pre className="mono overflow-x-auto rounded border border-rule bg-sunken p-3 text-xs">{flowCostAdaptedSource}</pre>
          </div>
        </details>
      </Panel>

      <Panel title="2 · Simulation behavior" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          A toy model: total material travel per shift, as trips × rectilinear distance between stations.
          It runs deterministically in your browser. It is not validated against any real facility and says
          nothing about real-world transfer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {scenarios.map((s) => (
            <Button
              key={s.id}
              variant={s.id === scenario.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => changeScenario(s.id)}
            >
              {s.title}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-2">{scenario.brief}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {scenario.layouts.map((layout) => {
            const outcome = outcomes.find((o) => o.layoutId === layout.id)!
            const picked = chosen === layout.id
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => setChosen(layout.id)}
                aria-pressed={picked}
                className={`rounded border p-3 text-left transition ${picked ? "border-accent bg-sunken" : "border-rule bg-surface hover:border-rule-strong"}`}
              >
                <LayoutMap layout={layout} highlight={picked} />
                <div className="mt-2 text-sm font-medium text-ink">{layout.label}</div>
                <div className="tabular mono text-xs text-ink-3">
                  {outcome.metresPerShift.toLocaleString()} m/shift
                  {layout.id === scenario.baselineLayoutId
                    ? " · baseline"
                    : ` · ${outcome.deltaVsBaselinePct > 0 ? "+" : ""}${outcome.deltaVsBaselinePct}%`}
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      <Panel title="3 · Expert decision record" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          Choose a layout above, then record why. Each record stores the scenario state, the action, the
          alternatives, the rationale, the computed outcome, reviewer feedback, and the component ids used.
          Records stay in this page and are lost on refresh; nothing is sent to a server.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="role">Participant role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="chosen">Chosen layout</Label>
            <Select id="chosen" value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">Select…</option>
              {scenario.layouts.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="rationale">Stated rationale</Label>
            <Textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="feedback">Reviewer feedback (optional)</Label>
            <Textarea id="feedback" className="min-h-16" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2 md:col-span-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Participant consented to this record being kept and used for evaluation
          </label>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-[var(--fail)]">{error}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={capture}>Capture decision</Button>
          <Button variant="secondary" onClick={download} disabled={records.length === 0}>
            <Download className="size-4" aria-hidden /> Export JSONL
          </Button>
          <span className="tabular text-sm text-ink-3">
            {records.length} captured
            {avgCompleteness !== null ? ` · ${Math.round(avgCompleteness * 100)}% complete on average` : ""}
          </span>
        </div>
        {records.length > 0 ? (
          <pre className="mono mt-3 max-h-64 overflow-auto rounded border border-rule bg-sunken p-3 text-xs">
            {JSON.stringify(records[records.length - 1], null, 2)}
          </pre>
        ) : null}
      </Panel>

      <Panel title="4 · Attribution and contributor share" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          Every record carries the component ids it used. The share below applies the live {contributorSharePct}%
          developer split to the marketplace&apos;s formula price for a low-complexity asset. It shows the arithmetic
          only. Pilot pricing and the license event that triggers payment are not yet agreed.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="tag text-left text-ink-4">
              <th className="py-1 font-normal">Component</th>
              <th className="py-1 font-normal">Formula price</th>
              <th className="py-1 font-normal">Contributor share</th>
            </tr>
          </thead>
          <tbody>
            {manifest.map((c) => (
              <tr key={c.id} className="border-t border-rule">
                <td className="mono py-1.5">{c.name}</td>
                <td className="tabular py-1.5">{formatMoney(c.price_cents)}</td>
                <td className="tabular py-1.5">{formatMoney(c.contributor_share_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Not built yet" actions={<Status live={false} />}>
        <ul className="list-disc pl-5 text-sm text-ink-2">
          <li>Assembling a simulation automatically from catalog components (this one is hand-built).</li>
          <li>Saving decision records to a database, participant recordings, and consent storage.</li>
          <li>Evaluation on held-out tasks against a baseline.</li>
          <li>Docker verification of these components; they have not been run through the pipeline.</li>
          <li>Any real manufacturing components or customer data.</li>
        </ul>
      </Panel>
    </div>
  )
}
