import type { Complexity } from "@/lib/taxonomy"
import {
  DEVELOPER_SHARE_RATE,
  PLATFORM_FEE_RATE,
  REFERRAL_RESERVE_RATE,
} from "@/lib/constants"

// Unit Economics Pricing Formula v1 (TRD §7.4).
// Developers do NOT set arbitrary prices — price is computed from complexity and
// quality score so pricing stays consistent and unmanipulable.

const BASE_PRICE_CENTS = 50 // $0.50 floor per asset delivery
const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  low: 1.0,
  medium: 2.5,
  high: 5.0,
}
const QUALITY_BONUS_PER_POINT_CENTS = 20 // quality_score * $0.20, score in [0,5]
const LANGUAGE_RARITY_FACTOR = 1.0 // TBD per spec

// quality_score is a 0–5 value (NUMERIC(3,2) in the schema).
export function computeAssetPriceCents(input: {
  complexity: Complexity
  qualityScore: number
}): number {
  const complexityComponent = BASE_PRICE_CENTS * COMPLEXITY_MULTIPLIER[input.complexity]
  const qualityBonus = clampScore(input.qualityScore) * QUALITY_BONUS_PER_POINT_CENTS
  return Math.round((complexityComponent + qualityBonus) * LANGUAGE_RARITY_FACTOR)
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
