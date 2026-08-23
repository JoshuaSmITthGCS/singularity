// Unit Economics Pricing Formula v1 (TRD §7.4). Mirrors src/lib/pricing.ts so
// the worker can reprice an asset once its quality score is known.

export type Complexity = "low" | "medium" | "high"

const BASE_PRICE_CENTS = 50
const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = { low: 1.0, medium: 2.5, high: 5.0 }
const QUALITY_BONUS_PER_POINT_CENTS = 20

export function computeAssetPriceCents(input: { complexity: Complexity; qualityScore: number }): number {
  const complexityComponent = BASE_PRICE_CENTS * COMPLEXITY_MULTIPLIER[input.complexity]
  const qualityBonus = clampScore(input.qualityScore) * QUALITY_BONUS_PER_POINT_CENTS
  return Math.round(complexityComponent + qualityBonus)
}

// Quality is scored 0–5 from three signals that actually vary between assets.
//
// The previous version derived the score from the source suite's pass rate,
// which looked like a gradient but was not one: runTests() only reports
// `passed` when zero tests failed, so the rate was always exactly 1.0 and every
// published asset scored the same. These inputs move independently:
//
//   verified base  2.0  the source suite ran and was green
//   suite depth    1.5  how much evidence that green actually represents
//   portability    1.5  how many sibling languages reproduced it
//
// Portability is the signal this product is uniquely able to observe, and it is
// the one buyers care about: code that survives translation into four other
// languages is code whose behaviour is well specified.
const VERIFIED_BASE = 2.0
const MAX_SUITE_DEPTH = 1.5
const MAX_PORTABILITY = 1.5
// Test count at which suite depth saturates. Beyond ~20 assertions, more tests
// stop being evidence of a better asset.
const SUITE_DEPTH_SATURATION = 20

export function computeQualityScore(input: {
  sourceTestsTotal: number | null
  variantsPassed: number
  variantsTotal: number
}): number {
  const depth = suiteDepthScore(input.sourceTestsTotal)
  const portability = portabilityScore(input.variantsPassed, input.variantsTotal)

  return round2(clampScore(VERIFIED_BASE + depth + portability))
}

// Log-scaled so the jump from 1 to 5 tests counts for much more than 15 to 20.
function suiteDepthScore(testsTotal: number | null) {
  if (!testsTotal || testsTotal <= 0) return 0

  const ratio = Math.log2(1 + testsTotal) / Math.log2(1 + SUITE_DEPTH_SATURATION)

  return Math.min(MAX_SUITE_DEPTH, ratio * MAX_SUITE_DEPTH)
}

function portabilityScore(variantsPassed: number, variantsTotal: number) {
  if (variantsTotal <= 0) return 0

  const ratio = Math.min(1, Math.max(0, variantsPassed / variantsTotal))

  return ratio * MAX_PORTABILITY
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0
  return Math.min(5, Math.max(0, score))
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
