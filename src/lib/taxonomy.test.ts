import { describe, expect, it } from "vitest"
import {
  ACTIONS,
  COMPLEXITY_LEVELS,
  ENGINES,
  GENRES,
  GENRE_GROUPS,
  PURPOSES,
} from "@/lib/taxonomy"

describe("taxonomy vocabularies (§4.5)", () => {
  it("has no duplicate values within each list", () => {
    for (const list of [GENRES, PURPOSES, ACTIONS, ENGINES, COMPLEXITY_LEVELS]) {
      expect(new Set(list).size).toBe(list.length)
    }
  })

  it("exposes the three complexity tiers used by the pricing formula", () => {
    expect([...COMPLEXITY_LEVELS]).toEqual(["low", "medium", "high"])
  })

  it("only groups genres that exist in the GENRES vocabulary", () => {
    const known = new Set<string>(GENRES)
    for (const grouped of Object.values(GENRE_GROUPS)) {
      for (const genre of grouped) {
        expect(known.has(genre)).toBe(true)
      }
    }
  })

  it("covers every genre in exactly one group", () => {
    const grouped = Object.values(GENRE_GROUPS).flat()
    expect(new Set(grouped).size).toBe(GENRES.length)
  })
})
