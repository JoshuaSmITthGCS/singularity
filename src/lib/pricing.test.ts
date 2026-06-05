import { describe, expect, it } from "vitest"
import { computeAssetPriceCents, computeRevenueSplitCents } from "@/lib/pricing"

describe("computeAssetPriceCents (TRD §7.4)", () => {
  it("prices on complexity alone when quality is unknown", () => {
    // BASE $0.50 × multiplier, no quality bonus.
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 0 })).toBe(50)
    expect(computeAssetPriceCents({ complexity: "medium", qualityScore: 0 })).toBe(125)
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 0 })).toBe(250)
  })

  it("adds the quality bonus ($0.20/point) on top of complexity", () => {
    // medium = 125c, + 4 × 20c = 80c → 205c
    expect(computeAssetPriceCents({ complexity: "medium", qualityScore: 4 })).toBe(205)
    // high = 250c, + 5 × 20c = 100c → 350c
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 5 })).toBe(350)
  })

  it("clamps the quality score to the 0–5 range", () => {
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 99 })).toBe(150) // 50 + 5×20
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: -5 })).toBe(50)
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: NaN })).toBe(50)
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
