// Server-side fixtures for /pilot-demo. Hashing uses node:crypto, so this file
// must not be imported by a client component — the page builds the manifest
// and hands it down as props.
import { createHash } from "node:crypto"
import { DEVELOPER_SHARE_RATE } from "@/lib/constants"
import { computeAssetPriceCents, computeRevenueSplitCents } from "@/lib/pricing"
import type { ComponentProvenance, Layout, Scenario } from "@/lib/pilot-demo"

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex")

const STATIONS = [
  { id: "recv", label: "Receiving" },
  { id: "cut", label: "Cutting" },
  { id: "weld", label: "Welding" },
  { id: "asm", label: "Assembly" },
  { id: "insp", label: "Inspection" },
  { id: "ship", label: "Shipping" },
]

function layout(id: string, label: string, coords: Array<[number, number]>): Layout {
  return {
    id,
    label,
    stations: STATIONS.map((s, i) => ({ ...s, x: coords[i][0], y: coords[i][1] })),
  }
}

// Metres on the shop floor. "Current" is a long straight line; the others
// are candidates an expert might propose.
const CURRENT = layout("current", "Current: straight line", [[0, 0], [12, 0], [24, 0], [36, 0], [48, 0], [60, 0]])
const U_CELL = layout("u-cell", "U-cell", [[0, 0], [10, 0], [20, 0], [20, 10], [10, 10], [0, 10]])
const HUB = layout("hub", "Central hub", [[0, 0], [10, 6], [20, 6], [10, 12], [20, 12], [30, 6]])

const BASE_FLOWS = [
  { from: "recv", to: "cut", tripsPerShift: 120 },
  { from: "cut", to: "weld", tripsPerShift: 120 },
  { from: "weld", to: "asm", tripsPerShift: 90 },
  { from: "asm", to: "insp", tripsPerShift: 90 },
  { from: "insp", to: "ship", tripsPerShift: 80 },
  { from: "cut", to: "asm", tripsPerShift: 30 },
]

export const SCENARIOS: Scenario[] = [
  {
    id: "steady-state",
    title: "Steady-state shift",
    brief:
      "Normal volume. Material moves forward through six stations, with a small cutting-to-assembly sub-part flow. Which layout should the line use?",
    flows: BASE_FLOWS,
    layouts: [CURRENT, U_CELL, HUB],
    baselineLayoutId: "current",
  },
  {
    id: "rework-surge",
    title: "Weld rework surge",
    brief:
      "A weld defect sends 60 parts per shift back to cutting, and inspection feeds rework to welding. Does the layout you picked still hold up?",
    flows: [
      ...BASE_FLOWS,
      { from: "weld", to: "cut", tripsPerShift: 60 },
      { from: "insp", to: "weld", tripsPerShift: 40 },
    ],
    layouts: [CURRENT, U_CELL, HUB],
    baselineLayoutId: "current",
  },
]

// Source text shown in the walkthrough and hashed for provenance. These mirror
// the functions in pilot-demo.ts; the hash is of this text, not of the bundle.
const MANHATTAN_SRC = `export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
`
const FLOW_COST_SRC = `export function travelDistance(layout, flows) {
  const byId = new Map(layout.stations.map((s) => [s.id, s]))
  let total = 0
  for (const f of flows) {
    total += f.tripsPerShift * manhattan(byId.get(f.from), byId.get(f.to))
  }
  return total
}
`
// The customer adaptation: fail loudly on a flow naming a missing station,
// instead of silently returning NaN. Recorded as a modification in the manifest.
const FLOW_COST_ADAPTED_SRC = `export function travelDistance(layout, flows) {
  const byId = new Map(layout.stations.map((s) => [s.id, s]))
  let total = 0
  for (const f of flows) {
    const from = byId.get(f.from)
    const to = byId.get(f.to)
    if (!from || !to) throw new Error("Flow names a station missing from the layout")
    total += f.tripsPerShift * manhattan(from, to)
  }
  return total
}
`

export const COMPONENT_SOURCES = {
  manhattan: MANHATTAN_SRC,
  flowCost: FLOW_COST_SRC,
  flowCostAdapted: FLOW_COST_ADAPTED_SRC,
}

function component(
  id: string,
  name: string,
  version: string,
  source: string,
  adapted: { source: string; note: string } | null
): ComponentProvenance {
  // Marketplace formula at low complexity, quality unscored. Illustrates the
  // contributor-share arithmetic only; it is not pilot pricing.
  const priceCents = computeAssetPriceCents({ complexity: "low", qualityScore: 0 })
  return {
    id,
    name,
    // Fixtures authored for this demo. No real contributor or repository.
    origin: "demo fixture (illustrative; no real contributor)",
    version,
    content_hash: sha256(source),
    adapted_hash: adapted ? sha256(adapted.source) : null,
    adaptation_note: adapted?.note ?? null,
    price_cents: priceCents,
    contributor_share_cents: computeRevenueSplitCents(priceCents).developerShareCents,
  }
}

export function buildManifest(): ComponentProvenance[] {
  return [
    component("manhattan-distance", "manhattan-distance", "1.0.0", MANHATTAN_SRC, null),
    component("flow-cost", "flow-cost", "1.0.0", FLOW_COST_SRC, {
      source: FLOW_COST_ADAPTED_SRC,
      note: "Customer adaptation: throw on a flow that names a missing station instead of returning NaN.",
    }),
  ]
}

export const CONTRIBUTOR_SHARE_PCT = Math.round(DEVELOPER_SHARE_RATE * 100)
