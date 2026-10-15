// Pure logic for the /pilot-demo walkthrough: a toy workstation-layout model,
// the expert decision-record shape, and the export/completeness helpers.
// No I/O and no node:crypto, so client components can import it. The model is
// an illustration for the enterprise pilot pitch — it is not validated against
// any real facility, and nothing here claims real-world transfer.
import type { z } from "zod"
import type { decisionRecordSchema } from "@/lib/validation"

export type Station = { id: string; label: string; x: number; y: number }
export type Flow = { from: string; to: string; tripsPerShift: number }
export type Layout = { id: string; label: string; stations: Station[] }

export type Scenario = {
  id: string
  title: string
  brief: string
  flows: Flow[]
  layouts: Layout[]
  baselineLayoutId: string
}

// Rectilinear aisles, so a forklift path is Manhattan distance in metres.
export function manhattan(a: Station, b: Station) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function travelDistance(layout: Layout, flows: Flow[]) {
  const byId = new Map(layout.stations.map((s) => [s.id, s]))
  let total = 0
  for (const flow of flows) {
    const from = byId.get(flow.from)
    const to = byId.get(flow.to)
    if (!from || !to) throw new Error(`Flow ${flow.from}->${flow.to} names a station missing from layout ${layout.id}`)
    total += flow.tripsPerShift * manhattan(from, to)
  }
  return total
}

export type LayoutOutcome = {
  layoutId: string
  label: string
  metresPerShift: number
  deltaVsBaselinePct: number
}

export function evaluateScenario(scenario: Scenario): LayoutOutcome[] {
  const baseline = scenario.layouts.find((l) => l.id === scenario.baselineLayoutId)
  if (!baseline) throw new Error(`Scenario ${scenario.id} has no baseline layout`)
  const baseMetres = travelDistance(baseline, scenario.flows)
  return scenario.layouts.map((layout) => {
    const metres = travelDistance(layout, scenario.flows)
    return {
      layoutId: layout.id,
      label: layout.label,
      metresPerShift: metres,
      deltaVsBaselinePct: baseMetres === 0 ? 0 : Math.round(((metres - baseMetres) / baseMetres) * 1000) / 10,
    }
  })
}

// The memo's Capture stage: state, action, alternatives, rationale, outcome,
// reviewer feedback, and contributor provenance.
export type DecisionRecordInput = z.infer<typeof decisionRecordSchema>

export type DecisionRecord = DecisionRecordInput & {
  record_id: string
  captured_at: string
  state: { flows: Flow[]; baseline_layout_id: string }
  outcome: LayoutOutcome
  component_ids: string[]
}

// Share of fields a reviewer would need that are actually filled in. Mirrors
// the memo's "decision-record completeness" metric; consent counts only when true.
export function recordCompleteness(record: DecisionRecordInput) {
  const checks = [
    record.alternatives_considered.length > 0,
    record.rationale.trim().length > 0,
    Boolean(record.reviewer_feedback && record.reviewer_feedback.trim().length > 0),
    record.consent_recorded,
  ]
  return checks.filter(Boolean).length / checks.length
}

export function toJsonl(records: DecisionRecord[]) {
  return records.map((r) => JSON.stringify(r)).join("\n")
}

export type ComponentProvenance = {
  id: string
  name: string
  origin: string
  version: string
  content_hash: string
  adapted_hash: string | null
  adaptation_note: string | null
  price_cents: number
  contributor_share_cents: number
}

// One "this code turns into this code" pair, with each change explained in
// plain language for a non-engineer reader.
export type TranslationChange = { before: string; after: string; why: string }

export type TranslationTarget = {
  id: string
  label: string
  runsIn: string
  code: string
  changes: TranslationChange[]
  // How far the demo can vouch for this translation. Never "passed": nothing
  // here ran through the Docker pipeline.
  evidence: string
  // metres per shift for [steady-state, rework-surge] on the current layout,
  // recorded from a real run; null when the language could not be run here.
  recordedResult: { steadyState: number; reworkSurge: number } | null
}
