import { createHmac, timingSafeEqual } from "node:crypto"
import { getWhopWebhookSecret } from "@/lib/whop/config"

// Whop's webhooks follow the Standard Webhooks spec (https://www.standardwebhooks.com/):
// headers `webhook-id` / `webhook-timestamp` / `webhook-signature`, signing
// `${id}.${timestamp}.${body}` with HMAC-SHA256 and base64-encoding the digest;
// the secret is issued as `whsec_<base64>`. This environment could not reach
// docs.whop.com directly to confirm byte-for-byte (egress to whop.com is
// blocked here) — cross-checked via two independent search results naming
// Whop + Standard Webhooks. CONFIRM against your Whop dashboard's webhook docs
// before relying on this in production (docs/PRODUCTION_SETUP.md §B2).
//
// A legacy bare-HMAC-over-raw-body fallback is kept for accounts that predate
// the Standard Webhooks rollout (or in case the spec guess is wrong).

const REPLAY_TOLERANCE_SECONDS = 5 * 60

export type WhopWebhookHeaders = {
  id: string | null
  timestamp: string | null
  signature: string | null
  legacySignature: string | null
}

export function readWhopWebhookHeaders(headers: Headers): WhopWebhookHeaders {
  return {
    id: headers.get("webhook-id"),
    timestamp: headers.get("webhook-timestamp"),
    signature: headers.get("webhook-signature"),
    legacySignature:
      headers.get("x-whop-signature") ||
      headers.get("whop-signature") ||
      headers.get("x-whop-webhook-signature"),
  }
}

export function verifyWhopSignature(rawBody: string, headers: WhopWebhookHeaders): boolean {
  if (headers.id && headers.timestamp && headers.signature) {
    return verifyStandardWebhook(rawBody, headers.id, headers.timestamp, headers.signature)
  }

  if (headers.legacySignature) {
    return verifyLegacyHmac(rawBody, headers.legacySignature)
  }

  return false
}

function verifyStandardWebhook(rawBody: string, id: string, timestamp: string, signatureHeader: string): boolean {
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  // Replay protection: Standard Webhooks senders resend the same signed
  // timestamp on retries, so reject anything outside a tolerance window.
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > REPLAY_TOLERANCE_SECONDS) return false

  const secret = getWhopWebhookSecret()
  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret)

  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = createHmac("sha256", key).update(signedContent).digest("base64")
  const expectedBuffer = Buffer.from(expected)

  // webhook-signature is a space-separated list of "v1,<base64sig>" pairs
  // (supports secret rotation) — match against any of them.
  return signatureHeader.split(" ").some((part) => {
    const [, sig] = part.split(",")
    if (!sig) return false
    const providedBuffer = Buffer.from(sig)
    return providedBuffer.length === expectedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
  })
}

function verifyLegacyHmac(rawBody: string, signatureHeader: string): boolean {
  const expected = createHmac("sha256", getWhopWebhookSecret()).update(rawBody).digest("hex")

  // Header may arrive as the bare hex digest or as `sha256=<digest>`.
  const provided = signatureHeader.includes("=") ? signatureHeader.split("=").pop() ?? "" : signatureHeader

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export type WhopWebhookEvent = {
  // e.g. "payment.succeeded", "payment.affiliate_reward_created", etc.
  action?: string
  type?: string
  event?: string
  data?: {
    id?: string
    status?: string
    metadata?: Record<string, string> | null
    [key: string]: unknown
  }
}

// Confirmed against the real event list on the Whop webhook-creation page
// (underscored names — "payment_succeeded" / "membership_activated" — not the
// dotted "payment.succeeded" this file previously guessed). The dotted forms
// are kept as a harmless fallback in case a future Whop API version reverts.
const PAYMENT_SUCCESS_EVENTS = new Set([
  "payment_succeeded",
  "payment.succeeded",
  "membership_activated",
  "membership.went_valid",
  "membership_went_valid",
])

export function isPaymentSuccess(event: WhopWebhookEvent): boolean {
  const name = event.action || event.type || event.event || ""
  return PAYMENT_SUCCESS_EVENTS.has(name)
}
