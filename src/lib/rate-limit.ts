import { errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"

// Fixed-window rate limiting. Real mode uses a Postgres-backed atomic counter
// (see migration 20260723000000_rate_limit_buckets.sql) so concurrent
// requests across serverless instances can't race past the limit. Demo mode
// has no database, so it falls back to an in-process Map — good enough for a
// single dev/CI instance, and demo routes never call paid APIs anyway.
//
// This is a small internal interface (not a public API contract), so it can
// be swapped for a Redis/Upstash backend later without touching call sites.

const memoryBuckets = new Map<string, { count: number; windowStart: number }>()

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export async function checkRateLimit(input: {
  key: string
  limit: number
  windowMs: number
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = input
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const retryAfterSeconds = Math.ceil((windowStart + windowMs - now) / 1000)

  if (isDemoMode()) {
    const bucket = memoryBuckets.get(key)
    if (!bucket || bucket.windowStart !== windowStart) {
      memoryBuckets.set(key, { count: 1, windowStart })
      return { allowed: true, retryAfterSeconds }
    }
    bucket.count += 1
    return { allowed: bucket.count <= limit, retryAfterSeconds }
  }

  const admin = createAdminClient()
  const { data: count, error } = await admin.rpc("increment_rate_limit", {
    p_bucket_key: key,
    p_window_start: new Date(windowStart).toISOString(),
  })

  // Fail open: a rate-limit-store outage should not take down the product.
  if (error) {
    console.error("rate limit check failed, allowing request", error.message)
    return { allowed: true, retryAfterSeconds }
  }

  return { allowed: (count as number) <= limit, retryAfterSeconds }
}

// Best-effort client identifier for anonymous routes. Not spoof-proof (a
// client controls its own X-Forwarded-For), but it's the standard first line
// of defense behind a proxy/CDN and matches what Netlify forwards.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

// 429 response in the standard envelope, with Retry-After set.
export function rateLimitedResponse(result: RateLimitResult) {
  return errorResponse("Too many requests. Please slow down.", 429, {
    code: "RATE_LIMITED",
    headers: { "Retry-After": String(result.retryAfterSeconds) },
  })
}
