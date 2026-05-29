import { createHmac, timingSafeEqual } from "node:crypto"
import { getWhopWebhookSecret } from "@/lib/whop/config"

// Verify a Whop webhook by recomputing an HMAC-SHA256 of the raw request body
// with the webhook secret and comparing it to the signature header.
//
// VERIFY AGAINST CURRENT WHOP DOCS: the signature header name and exact signing
// scheme (some providers sign `${timestamp}.${body}` and prefix the header
// value). Adjust the header lookup / signed payload here to match.
export function verifyWhopSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false

  const expected = createHmac("sha256", getWhopWebhookSecret()).update(rawBody).digest("hex")

  // Header may arrive as the bare hex digest or as `sha256=<digest>`.
  const provided = signatureHeader.includes("=")
    ? signatureHeader.split("=").pop() ?? ""
    : signatureHeader

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export function readWhopSignature(headers: Headers): string | null {
  return (
    headers.get("x-whop-signature") ||
    headers.get("whop-signature") ||
    headers.get("x-whop-webhook-signature")
  )
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

const PAYMENT_SUCCESS_EVENTS = new Set([
  "payment.succeeded",
  "payment_succeeded",
  "membership.went_valid",
  "membership_went_valid",
])

export function isPaymentSuccess(event: WhopWebhookEvent): boolean {
  const name = event.action || event.type || event.event || ""
  return PAYMENT_SUCCESS_EVENTS.has(name)
}
