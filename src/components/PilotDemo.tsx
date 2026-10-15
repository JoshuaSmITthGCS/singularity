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
  type TranslationTarget,
} from "@/lib/pilot-demo"
import { decisionRecordSchema } from "@/lib/validation"
import { formatMoney } from "@/lib/utils"

const ROLES = [
  ["process_engineer", "Process engineer"],
  ["operator", "Operator"],
  ["supervisor", "Supervisor"],
  ["other", "Other"],
] as const

const HOW_IT_WORKS = [
  { title: "A developer shares code", body: "Someone has already written useful code, for example a tool that measures how far material travels across a factory floor." },
  { title: "Singularity rewrites it", body: "The same code is translated into the language a buyer's team actually uses, with unit and naming differences handled." },
  { title: "It is checked before it is sold", body: "In the product, each rewritten version is built and tested in an isolated sandbox. Only versions that pass are offered." },
  { title: "An expert uses it, the developer is paid", body: "The code powers a simulation. An expert's decisions are recorded, and the original developer earns a share." },
]

// Status colors encode verification state, so live/planned uses accent/neutral.
function Status({ label, live }: { label?: string; live: boolean }) {
  return <Badge tone={live ? "accent" : "neutral"}>{label ?? (live ? "Live" : "Planned")}</Badge>
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="min-w-0">
      <div className="tag mb-1 text-ink-4">{title}</div>
      <pre className="mono max-h-80 overflow-auto rounded border border-rule bg-sunken p-3 text-xs leading-5">{code}</pre>
    </div>
  )
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
  originalSource,
  targets,
}: {
  scenarios: Scenario[]
  manifest: ComponentProvenance[]
  contributorSharePct: number
  originalSource: string
  targets: TranslationTarget[]
}) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]
  const outcomes = useMemo(() => evaluateScenario(scenario), [scenario])

  const [targetId, setTargetId] = useState(targets[0].id)
  const target = targets.find((t) => t.id === targetId) ?? targets[0]

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

  // The TypeScript answer for the layout the factory runs today, computed live.
  const liveResults = scenarios.map((s) => {
    const base = evaluateScenario(s).find((o) => o.layoutId === s.baselineLayoutId)
    return { id: s.id, title: s.title, metres: base?.metresPerShift ?? 0 }
  })

  return (
    <div className="grid gap-5">
      <section aria-label="How it works" className="grid gap-3 md:grid-cols-4">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title} className="rounded border border-rule bg-surface p-3">
            <div className="tag text-ink-4">Step {i + 1}</div>
            <div className="mt-1 text-sm font-medium text-ink">{step.title}</div>
            <p className="mt-1 text-sm leading-5 text-ink-2">{step.body}</p>
          </div>
        ))}
      </section>

      <Panel title="1 · The code a developer already wrote" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          This small tool answers one factory question: <strong>how many metres does material travel in a
          shift?</strong> It multiplies the number of trips between each pair of stations by the distance
          between them. It is written in TypeScript, so a team on a different stack could not use it as is.
        </p>
        <div className="mt-3">
          <CodeBlock title="Original · TypeScript" code={originalSource} />
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {manifest.map((c) => (
            <li key={c.id} className="rounded border border-rule bg-sunken p-3 text-sm">
              <div className="mono font-medium text-ink">{c.name}@{c.version}</div>
              <div className="mono mt-1 text-xs text-ink-3">fingerprint (SHA-256) {c.content_hash.slice(0, 16)}…</div>
              {c.adapted_hash ? (
                <div className="mono text-xs text-ink-3">with customer change (code shown above) {c.adapted_hash.slice(0, 16)}…</div>
              ) : null}
              {c.adaptation_note ? <p className="mt-1.5 text-ink-2">{c.adaptation_note}</p> : null}
              <p className="tag mt-1.5 text-ink-4">{c.origin}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">
          A fingerprint is a short code computed from the exact text. If one character changes, the fingerprint
          changes, so every use of the code can be traced to a specific version.
        </p>
      </Panel>

      <Panel title="2 · The same code, rewritten for another system" actions={<Status live={false} label="Illustrative" />}>
        <p className="text-sm text-ink-2">
          A buyer&apos;s team might use C# (Unity, Godot, .NET) or C++ (Unreal, robotics). Pick one to see the
          rewrite side by side. These two versions were written by hand for this demo. In the product,
          Claude produces them and a sandbox must pass them before they are sold.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Target language">
          {targets.map((t) => (
            <Button
              key={t.id}
              variant={t.id === target.id ? "primary" : "secondary"}
              size="sm"
              aria-pressed={t.id === target.id}
              onClick={() => setTargetId(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-3">Runs in: {target.runsIn}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <CodeBlock title="Before · TypeScript" code={originalSource} />
          <CodeBlock title={`After · ${target.label}`} code={target.code} />
        </div>

        <h3 className="tag mt-4 text-ink-3">What changed, and why</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="tag text-left text-ink-4">
              <th className="py-1 pr-3 font-normal">Before</th>
              <th className="py-1 pr-3 font-normal">After</th>
              <th className="py-1 font-normal">Why</th>
            </tr>
          </thead>
          <tbody>
            {target.changes.map((c) => (
              <tr key={c.before + c.after} className="border-t border-rule align-top">
                <td className="mono py-1.5 pr-3 text-xs">{c.before}</td>
                <td className="mono py-1.5 pr-3 text-xs">{c.after}</td>
                <td className="py-1.5 text-ink-2">{c.why}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 rounded border border-rule bg-sunken p-3 text-sm">
          <div className="tag text-ink-3">Same question, same answer?</div>
          <p className="mt-1 text-ink-2">{target.evidence}</p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="tag text-left text-ink-4">
                <th className="py-1 font-normal">Factory layout today</th>
                <th className="py-1 font-normal">TypeScript (computed live)</th>
                <th className="py-1 font-normal">{target.label} (recorded run)</th>
              </tr>
            </thead>
            <tbody>
              {liveResults.map((r, i) => {
                const recorded = target.recordedResult
                  ? i === 0 ? target.recordedResult.steadyState : target.recordedResult.reworkSurge
                  : null
                return (
                  <tr key={r.id} className="border-t border-rule">
                    <td className="py-1.5">{r.title}</td>
                    <td className="tabular mono py-1.5">{r.metres.toLocaleString()} m</td>
                    <td className="tabular mono py-1.5">
                      {recorded === null ? "not run" : `${recorded.toLocaleString()} m`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="3 · Using the code: compare factory layouts" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          The tool now powers a simple simulation of one assembly line with six stations. Lower travel means
          less forklift time. It is a toy model, not validated against any real facility, and says nothing
          about real-world results. Click a layout to select it.
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

      <Panel title="4 · An expert's decision is recorded" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          Choose a layout above, then record why. Each record keeps the situation, the choice, the options
          not chosen, the expert&apos;s reasoning, the computed result, reviewer feedback, and which code
          was used. This is the data an enterprise customer would use to evaluate or train an AI system.
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

      <Panel title="5 · The original developer gets paid" actions={<Status live />}>
        <p className="text-sm text-ink-2">
          Every record names the code it used, so credit follows the work. Below, the live {contributorSharePct}%
          developer share is applied to the marketplace&apos;s formula price for a low-complexity asset. This
          shows the arithmetic only. Pilot pricing and the licensing event that triggers payment are not yet agreed.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="tag text-left text-ink-4">
              <th className="py-1 font-normal">Code used</th>
              <th className="py-1 font-normal">Formula price</th>
              <th className="py-1 font-normal">Developer share</th>
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
          <li>The two rewrites above are hand-written examples. Nothing here ran through the Claude translation and Docker pipeline.</li>
          <li>The C# version has not been compiled in this build.</li>
          <li>Assembling a simulation automatically from catalog components (this one is hand-built).</li>
          <li>Saving decision records to a database, participant recordings, and consent storage.</li>
          <li>Evaluation on held-out tasks against a baseline.</li>
          <li>Any real manufacturing components or customer data.</li>
        </ul>
      </Panel>
    </div>
  )
}
