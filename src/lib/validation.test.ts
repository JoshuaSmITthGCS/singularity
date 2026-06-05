import { describe, expect, it } from "vitest"
import {
  clientEnvConfigSchema,
  createAssetSchema,
  searchQuerySchema,
  tagSchema,
} from "@/lib/validation"

const validAsset = {
  source_type: "paste" as const,
  source_language: "typescript" as const,
  title: "A* pathfinder",
  short_description: "Grid-based A* pathfinding for tile maps.",
  summary: "A compact, well-tested A* implementation for 2D tile grids with diagonal movement.",
  source_code: "export const a = 1",
  test_code: "test('x', () => {})",
}

describe("createAssetSchema", () => {
  it("accepts a valid paste asset and defaults complexity to medium", () => {
    const parsed = createAssetSchema.parse(validAsset)
    expect(parsed.complexity).toBe("medium")
  })

  it("no longer accepts a developer-set price (price is formula-computed)", () => {
    const parsed = createAssetSchema.parse({ ...validAsset, price_cents: 9999 })
    expect("price_cents" in parsed).toBe(false)
  })

  it("rejects a too-short summary", () => {
    expect(createAssetSchema.safeParse({ ...validAsset, summary: "too short" }).success).toBe(false)
  })

  it("rejects an unsupported language", () => {
    expect(
      createAssetSchema.safeParse({ ...validAsset, source_language: "python" }).success
    ).toBe(false)
  })
})

describe("tagSchema (§4.5)", () => {
  it("accepts controlled-vocabulary values and defaults empty arrays", () => {
    const parsed = tagSchema.parse({ genre: ["game"], complexity: undefined, keywords: ["a*"] })
    expect(parsed.genre).toEqual(["game"])
    expect(parsed.purpose).toEqual([])
  })

  it("rejects a genre outside the vocabulary", () => {
    expect(tagSchema.safeParse({ genre: ["not-a-genre"] }).success).toBe(false)
  })
})

describe("clientEnvConfigSchema (§5.1)", () => {
  it("applies metric / main / pr_mode defaults", () => {
    const parsed = clientEnvConfigSchema.parse({ primary_language: "csharp" })
    expect(parsed.unit_system).toBe("metric")
    expect(parsed.target_branch).toBe("main")
    expect(parsed.pr_mode).toBe(true)
  })

  it("rejects an invalid naming convention", () => {
    expect(
      clientEnvConfigSchema.safeParse({ primary_language: "csharp", naming_convention: "kebab" })
        .success
    ).toBe(false)
  })
})

describe("searchQuerySchema (§5.2)", () => {
  it("coerces page and defaults it to 1", () => {
    expect(searchQuerySchema.parse({}).page).toBe(1)
    expect(searchQuerySchema.parse({ page: "3" }).page).toBe(3)
  })

  it("accepts repeated structured filters", () => {
    const parsed = searchQuerySchema.parse({ genre: ["game", "web"], engine: ["unity"] })
    expect(parsed.genre).toEqual(["game", "web"])
    expect(parsed.engine).toEqual(["unity"])
  })
})
