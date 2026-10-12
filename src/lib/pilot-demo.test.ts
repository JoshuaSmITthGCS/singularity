import { describe, expect, it } from "vitest"
import {
  evaluateScenario,
  manhattan,
  recordCompleteness,
  toJsonl,
  travelDistance,
  type DecisionRecord,
} from "@/lib/pilot-demo"
import { COMPONENT_SOURCES, SCENARIOS, buildManifest } from "@/lib/pilot-demo-fixtures"
import { decisionRecordSchema } from "@/lib/validation"

describe("travelDistance", () => {
  it("weights each flow's Manhattan distance by trips per shift", () => {
    const layout = {
      id: "t",
      label: "t",
      stations: [
        { id: "a", label: "a", x: 0, y: 0 },
        { id: "b", label: "b", x: 3, y: 4 },
      ],
    }
    expect(manhattan(layout.stations[0], layout.stations[1])).toBe(7)
    expect(travelDistance(layout, [{ from: "a", to: "b", tripsPerShift: 10 }])).toBe(70)
  })

  it("throws on a flow that names a missing station rather than returning NaN", () => {
    const layout = { id: "t", label: "t", stations: [{ id: "a", label: "a", x: 0, y: 0 }] }
    expect(() => travelDistance(layout, [{ from: "a", to: "zzz", tripsPerShift: 1 }])).toThrow(/missing/)
  })
})

describe("evaluateScenario", () => {
  it("reports the baseline layout at 0% and others relative to it", () => {
    for (const scenario of SCENARIOS) {
      const outcomes = evaluateScenario(scenario)
      const baseline = outcomes.find((o) => o.layoutId === scenario.baselineLayoutId)
      expect(baseline?.deltaVsBaselinePct).toBe(0)
      expect(outcomes).toHaveLength(scenario.layouts.length)
    }
  })

  it("shows a U-cell shortening travel against the straight line in steady state", () => {
    const outcomes = evaluateScenario(SCENARIOS[0])
    const uCell = outcomes.find((o) => o.layoutId === "u-cell")
    expect(uCell?.deltaVsBaselinePct).toBeLessThan(0)
  })

  it("keeps every fixture flow resolvable in every layout", () => {
    for (const scenario of SCENARIOS) {
      for (const layout of scenario.layouts) {
        expect(() => travelDistance(layout, scenario.flows)).not.toThrow()
      }
    }
  })
})

describe("decision records", () => {
  const valid = {
    scenario_id: "steady-state",
    participant_role: "process_engineer" as const,
    chosen_layout_id: "u-cell",
    alternatives_considered: ["hub"],
    rationale: "Welding and assembly sit adjacent, cutting the heaviest hauls.",
    reviewer_feedback: "Credible.",
    consent_recorded: true,
  }

  it("accepts a complete record and rejects a missing rationale", () => {
    expect(decisionRecordSchema.safeParse(valid).success).toBe(true)
    expect(decisionRecordSchema.safeParse({ ...valid, rationale: "  " }).success).toBe(false)
  })

  it("scores completeness from alternatives, rationale, feedback and consent", () => {
    expect(recordCompleteness(valid)).toBe(1)
    expect(recordCompleteness({ ...valid, reviewer_feedback: undefined, consent_recorded: false })).toBe(0.5)
  })

  it("exports one JSON object per line", () => {
    const outcome = evaluateScenario(SCENARIOS[0])[1]
    const record: DecisionRecord = {
      ...valid,
      record_id: "r1",
      captured_at: "2026-10-12T00:00:00.000Z",
      state: { flows: SCENARIOS[0].flows, baseline_layout_id: "current" },
      outcome,
      component_ids: ["flow-cost"],
    }
    const lines = toJsonl([record, { ...record, record_id: "r2" }]).split("\n")
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1]).record_id).toBe("r2")
  })
})

describe("component manifest", () => {
  const manifest = buildManifest()

  it("hashes deterministically and distinguishes the adapted source", () => {
    expect(buildManifest()[1].content_hash).toBe(manifest[1].content_hash)
    expect(manifest[1].adapted_hash).not.toBeNull()
    expect(manifest[1].adapted_hash).not.toBe(manifest[1].content_hash)
    expect(COMPONENT_SOURCES.flowCostAdapted).not.toBe(COMPONENT_SOURCES.flowCost)
  })

  it("leaves unmodified components without an adaptation record", () => {
    expect(manifest[0].adapted_hash).toBeNull()
    expect(manifest[0].adaptation_note).toBeNull()
  })

  it("computes the contributor share from the live 70% split", () => {
    // Low complexity, unscored: 50 cents → 35 cents to the developer.
    expect(manifest[0].price_cents).toBe(50)
    expect(manifest[0].contributor_share_cents).toBe(35)
  })
})
