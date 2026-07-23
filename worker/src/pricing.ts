import type { TestResult } from "./types.js"

// Unit Economics Pricing Formula v2 (TRD §7.4, revised — see docs/PRICING.md).
// Mirrors src/lib/pricing.ts so the worker can reprice an asset once its
// quality score is known.

export type Complexity = "low" | "medium" | "high"

const BASE_PRICE_CENTS = 400
const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = { low: 1.0, medium: 2.5, high: 5.0 }
const QUALITY_BONUS_PER_POINT_CENTS = 100
// $6 — the platform absorbs Whop processing fees; see docs/PRICING.md §4.
const PRICE_FLOOR_CENTS = 600

export function computeAssetPriceCents(input: { complexity: Complexity; qualityScore: number }): number {
  const complexityComponent = BASE_PRICE_CENTS * COMPLEXITY_MULTIPLIER[input.complexity]
  const qualityBonus = clampScore(input.qualityScore) * QUALITY_BONUS_PER_POINT_CENTS
  return Math.max(PRICE_FLOOR_CENTS, Math.round(complexityComponent + qualityBonus))
}

// Map verification results to a 0–5 quality score. Pass rate is the dominant
// signal; a passing suite with tests earns a strong baseline.
export function computeQualityScore(result: TestResult): number {
  if (result.status !== "passed") return 0
  const total = result.testsTotal ?? 0
  if (total === 0) return 3.0 // passed but no measurable suite
  const passRate = (result.testsPassed ?? 0) / total
  return Math.round(Math.min(5, 3.0 + passRate * 2.0) * 100) / 100
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0
  return Math.min(5, Math.max(0, score))
}
