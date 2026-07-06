import { describe, expect, it } from "vitest"
import { computeAssetPriceCents, computeRevenueSplitCents } from "@/lib/pricing"

describe("computeAssetPriceCents (TRD §7.4, v2 curve)", () => {
  it("prices on complexity alone when quality is unknown", () => {
    // BASE $4.00 × multiplier, no quality bonus.
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 0 })).toBe(400)
    expect(computeAssetPriceCents({ complexity: "medium", qualityScore: 0 })).toBe(1000)
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 0 })).toBe(2000)
  })

  it("adds the quality bonus ($1.00/point) on top of complexity", () => {
    // medium = 1000c, + 4 × 100c = 400c → 1400c
    expect(computeAssetPriceCents({ complexity: "medium", qualityScore: 4 })).toBe(1400)
    // high = 2000c, + 5 × 100c = 500c → 2500c ($25 ceiling of the curve)
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 5 })).toBe(2500)
  })

  it("clamps the quality score to the 0–5 range", () => {
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 99 })).toBe(900) // 400 + 5×100
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: -5 })).toBe(400)
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: NaN })).toBe(400)
  })

  it("never lists below the $4 verification-cost floor", () => {
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 0 })).toBeGreaterThanOrEqual(400)
  })

  it("returns whole-cent integers", () => {
    const price = computeAssetPriceCents({ complexity: "high", qualityScore: 3.5 })
    expect(Number.isInteger(price)).toBe(true)
  })
})

describe("computeRevenueSplitCents (70/25/5)", () => {
  it("splits cleanly when divisible", () => {
    const split = computeRevenueSplitCents(1000)
    expect(split.developerShareCents).toBe(700)
    expect(split.platformFeeCents).toBe(250)
    expect(split.referralReserveCents).toBe(50)
  })

  it("never loses or invents cents — the parts always sum to the whole", () => {
    for (const price of [1, 7, 99, 333, 12345, 250]) {
      const { developerShareCents, platformFeeCents, referralReserveCents } =
        computeRevenueSplitCents(price)
      expect(developerShareCents + platformFeeCents + referralReserveCents).toBe(price)
    }
  })

  it("gives the developer the majority share", () => {
    const { developerShareCents } = computeRevenueSplitCents(10_000)
    expect(developerShareCents).toBeGreaterThanOrEqual(7000)
  })
})
