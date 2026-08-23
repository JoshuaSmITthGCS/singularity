import { describe, expect, it } from "vitest"
import { freeTextFilter } from "@/lib/marketplace/search"

describe("freeTextFilter", () => {
  it("builds an ilike clause per searchable column", () => {
    expect(freeTextFilter("pathfinding")).toBe(
      'title.ilike."%pathfinding%",short_description.ilike."%pathfinding%",summary.ilike."%pathfinding%"'
    )
  })

  // PostgREST parses the `or=` argument as filter syntax. Unquoted, a comma in
  // `q` ended one clause and started another, letting a search term rewrite the
  // query. Quoting makes the separators literal.
  it("neutralises PostgREST filter separators in the search term", () => {
    const filter = freeTextFilter("a,price_cents.gt.0")

    expect(filter).toBe(
      'title.ilike."%a,price_cents.gt.0%",short_description.ilike."%a,price_cents.gt.0%",summary.ilike."%a,price_cents.gt.0%"'
    )
    // Three clauses, not the five an injected term would have produced.
    expect(filter.split('",').length).toBe(3)
  })

  it("escapes quotes and backslashes so the value cannot close its own quoting", () => {
    expect(freeTextFilter('say "hi"')).toContain('title.ilike."%say \\"hi\\"%"')
    expect(freeTextFilter("back\\slash")).toContain('title.ilike."%back\\\\slash%"')
  })

  it("leaves parentheses inert inside the quoted value", () => {
    expect(freeTextFilter("f(x)")).toContain('title.ilike."%f(x)%"')
  })
})
