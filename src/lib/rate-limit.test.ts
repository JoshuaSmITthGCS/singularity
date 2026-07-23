import { describe, expect, it } from "vitest"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// Runs against the in-memory (demo-mode) path — no real backend env vars are
// set in the test environment, so isDemoMode() is true and every call here
// exercises the same branch production hits when SINGULARITY_REAL_BACKEND is
// unset. Each test uses a unique key so module-level bucket state can't leak
// between assertions.

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then rejects", async () => {
    const key = `test:${Math.random()}`
    const config = { key, limit: 3, windowMs: 60_000 }

    expect((await checkRateLimit(config)).allowed).toBe(true)
    expect((await checkRateLimit(config)).allowed).toBe(true)
    expect((await checkRateLimit(config)).allowed).toBe(true)
    expect((await checkRateLimit(config)).allowed).toBe(false)
  })

  it("keeps separate buckets per key", async () => {
    const config = (key: string) => ({ key, limit: 1, windowMs: 60_000 })
    const keyA = `test:a:${Math.random()}`
    const keyB = `test:b:${Math.random()}`

    expect((await checkRateLimit(config(keyA))).allowed).toBe(true)
    expect((await checkRateLimit(config(keyB))).allowed).toBe(true)
    expect((await checkRateLimit(config(keyA))).allowed).toBe(false)
  })

  it("reports a retry-after within the current window", async () => {
    const key = `test:${Math.random()}`
    const result = await checkRateLimit({ key, limit: 1, windowMs: 60_000 })
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60)
  })
})

describe("getClientIp", () => {
  it("reads the first hop of X-Forwarded-For", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(getClientIp(request)).toBe("1.2.3.4")
  })

  it("falls back to X-Real-IP, then unknown", () => {
    expect(getClientIp(new Request("https://example.com", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe(
      "9.9.9.9"
    )
    expect(getClientIp(new Request("https://example.com"))).toBe("unknown")
  })
})
