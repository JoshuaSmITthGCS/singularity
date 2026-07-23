import type { Complexity } from "@/lib/taxonomy"
import {
  DEVELOPER_SHARE_RATE,
  PLATFORM_FEE_RATE,
  REFERRAL_RESERVE_RATE,
} from "@/lib/constants"

// Unit Economics Pricing Formula v2 (TRD §7.4, parameters revised — see docs/PRICING.md).
// Developers do NOT set arbitrary prices — price is computed from complexity and
// quality score so pricing stays consistent and unmanipulable. v2 raises the
// curve to $4–$25 (comps: Unity Asset Store scripts $5–$40) so a sale covers
// the LLM verification cost with margin; v1's $0.50 base was underwater.

const BASE_PRICE_CENTS = 400 // $4.00 base per asset
const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  low: 1.0,
  medium: 2.5,
  high: 5.0,
}
const QUALITY_BONUS_PER_POINT_CENTS = 100 // quality_score * $1.00, score in [0,5]
// $6, not $4: the platform absorbs Whop's processing fee (2.9% + $0.30) rather
// than passing it through, and a $4 sale's fixed $0.30 fee alone eats ~7.5% of
// revenue before verification cost is even counted. See docs/PRICING.md §4.
const PRICE_FLOOR_CENTS = 600
const LANGUAGE_RARITY_FACTOR = 1.0 // TBD per spec

// quality_score is a 0–5 value (NUMERIC(3,2) in the schema).
export function computeAssetPriceCents(input: {
  complexity: Complexity
  qualityScore: number
}): number {
  const complexityComponent = BASE_PRICE_CENTS * COMPLEXITY_MULTIPLIER[input.complexity]
  const qualityBonus = clampScore(input.qualityScore) * QUALITY_BONUS_PER_POINT_CENTS
  const price = Math.round((complexityComponent + qualityBonus) * LANGUAGE_RARITY_FACTOR)
  return Math.max(PRICE_FLOOR_CENTS, price)
}

// Revenue split applied at smart-contract execution (TRD §7.4): 70/25/5.
// Mirrors lib/procurements/delivery.calculateShares but keyed off the formula
// price so the two never drift.
export function computeRevenueSplitCents(priceCents: number) {
  const developerShareCents = Math.round(priceCents * DEVELOPER_SHARE_RATE)
  const platformFeeCents = Math.round(priceCents * PLATFORM_FEE_RATE)
  const referralReserveCents = Math.round(priceCents * REFERRAL_RESERVE_RATE)
  const rounding = priceCents - developerShareCents - platformFeeCents - referralReserveCents

  return {
    developerShareCents,
    platformFeeCents: platformFeeCents + rounding,
    referralReserveCents,
  }
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0
  return Math.min(5, Math.max(0, score))
}
