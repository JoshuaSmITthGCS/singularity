import { getAppUrl, getRequiredEnv } from "@/lib/env"

export function getGitHubInstallUrl() {
  const explicitUrl = process.env.GITHUB_APP_INSTALL_URL

  if (explicitUrl) return explicitUrl

  const slug = process.env.GITHUB_APP_SLUG

  if (!slug) {
    throw new Error("GITHUB_APP_SLUG is required")
  }

  const callback = encodeURIComponent(`${getAppUrl()}/dashboard`)

  return `https://github.com/apps/${slug}/installations/new?state=${callback}`
}

export function getGitHubWebhookSecret() {
  return getRequiredEnv("GITHUB_APP_WEBHOOK_SECRET")
}

export function hasGitHubAppEnv() {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_CLIENT_ID &&
      process.env.GITHUB_APP_CLIENT_SECRET &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_APP_WEBHOOK_SECRET
  )
}
