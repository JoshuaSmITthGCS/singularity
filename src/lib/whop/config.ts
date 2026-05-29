import { getRequiredEnv } from "@/lib/env"

// Whop "Whop for Platforms" (connected accounts) config.
//
// Model: each developer gets a connected Whop company under the platform's
// parent company. Asset products are created on the developer's company with an
// application_fee_amount = the platform's cut; Whop routes the remainder to the
// developer's connected balance and they withdraw via the hosted payout portal.
//
// VERIFY AGAINST CURRENT WHOP DOCS before going live: the REST base URL, the
// endpoint paths in client.ts, and the webhook signature scheme in webhook.ts.
// The architecture is stable; field/endpoint names should be confirmed.

export const WHOP_API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com"

// Company API key (scopes: company/product/plan/checkout/account-link creation,
// incl. access_pass:create) for the platform parent company.
export function getWhopApiKey() {
  return getRequiredEnv("WHOP_API_KEY")
}

export function getWhopWebhookSecret() {
  return getRequiredEnv("WHOP_WEBHOOK_SECRET")
}

// The platform's parent company id (biz_...). Developer companies are created
// as children of this one.
export function getWhopPlatformCompanyId() {
  return getRequiredEnv("WHOP_PLATFORM_COMPANY_ID")
}

export function hasWhopEnv() {
  return Boolean(
    process.env.WHOP_API_KEY &&
      process.env.WHOP_WEBHOOK_SECRET &&
      process.env.WHOP_PLATFORM_COMPANY_ID
  )
}
