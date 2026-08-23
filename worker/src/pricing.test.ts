import { describe, expect, it } from "vitest"
import { computeAssetPriceCents, computeQualityScore } from "./pricing.js"

const green = { sourceTestsTotal: 10, variantsPassed: 5, variantsTotal: 5 }

describe("computeQualityScore", () => {
  // The defect this replaced: the old score read the source suite's pass rate,
  // but runTests() only reports `passed` when zero tests failed, so the rate
  // was always 1.0 and every published asset scored identically.
  it("separates assets that the previous formula scored the same", () => {
    const thin = computeQualityScore({ sourceTestsTotal: 1, variantsPassed: 1, variantsTotal: 5 })
    const thorough = computeQualityScore({ sourceTestsTotal: 24, variantsPassed: 5, variantsTotal: 5 })

    expect(thin).toBeLessThan(thorough)
    expect(new Set([thin, thorough]).size).toBe(2)
  })

  it("rewards a deeper suite", () => {
    const shallow = computeQualityScore({ ...green, sourceTestsTotal: 2 })
    const deep = computeQualityScore({ ...green, sourceTestsTotal: 20 })

    expect(deep).toBeGreaterThan(shallow)
  })

  it("saturates suite depth so test-count padding stops paying", () => {
    const saturated = computeQualityScore({ ...green, sourceTestsTotal: 20 })
    const padded = computeQualityScore({ ...green, sourceTestsTotal: 500 })

    expect(padded).toBe(saturated)
  })

  it("rewards portability across sibling languages", () => {
    const isolated = computeQualityScore({ ...green, variantsPassed: 1 })
    const portable = computeQualityScore({ ...green, variantsPassed: 5 })

    expect(portable).toBeGreaterThan(isolated)
  })

  it("stays inside 0–5 at both extremes", () => {
    expect(computeQualityScore({ sourceTestsTotal: null, variantsPassed: 0, variantsTotal: 0 })).toBe(2)
    expect(computeQualityScore({ sourceTestsTotal: 9999, variantsPassed: 5, variantsTotal: 5 })).toBe(5)
  })

  it("survives missing or nonsensical counts without producing NaN", () => {
    for (const input of [
      { sourceTestsTotal: null, variantsPassed: 0, variantsTotal: 5 },
      { sourceTestsTotal: 0, variantsPassed: 0, variantsTotal: 0 },
      { sourceTestsTotal: -3, variantsPassed: 9, variantsTotal: 5 },
    ]) {
      const score = computeQualityScore(input)
      expect(Number.isNaN(score)).toBe(false)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(5)
    }
  })
})

describe("computeAssetPriceCents", () => {
  it("scales with complexity", () => {
    expect(computeAssetPriceCents({ complexity: "low", qualityScore: 0 })).toBe(50)
    expect(computeAssetPriceCents({ complexity: "medium", qualityScore: 0 })).toBe(125)
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 0 })).toBe(250)
  })

  it("adds the quality bonus and stays inside the documented ceiling", () => {
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 5 })).toBe(350)
    expect(computeAssetPriceCents({ complexity: "high", qualityScore: 99 })).toBe(350)
  })
})
