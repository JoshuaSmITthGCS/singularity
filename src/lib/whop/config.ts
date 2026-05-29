import { getRequiredEnv } from "@/lib/env"

// Whop integration config.
//
// VERIFY AGAINST CURRENT WHOP DOCS before going live: the REST base URL, the
// exact endpoint paths used in client.ts, and the webhook signature scheme in
// webhook.ts. Whop has revised its API surface across versions; the
// architecture here (plan -> checkout session -> webhook -> fulfillment) is
// stable, but field/endpoint names should be confirmed.

export const WHOP_API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com"

export function getWhopApiKey() {
  return getRequiredEnv("WHOP_API_KEY")
}

export function getWhopWebhookSecret() {
  return getRequiredEnv("WHOP_WEBHOOK_SECRET")
}

// The product/company a plan is attached to. Whop requires plans to belong to a
// product; create one in the Whop dashboard and put its id here.
export function getWhopProductId() {
  return getRequiredEnv("WHOP_PRODUCT_ID")
}

export function hasWhopEnv() {
  return Boolean(
    process.env.WHOP_API_KEY &&
      process.env.WHOP_WEBHOOK_SECRET &&
      process.env.WHOP_PRODUCT_ID
  )
}
