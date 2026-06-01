import path from "node:path"
import { config as loadEnv } from "dotenv"

loadEnv({ path: path.resolve(process.cwd(), "../.env.local") })
loadEnv()

export const workerConfig = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  workerId: process.env.WORKER_ID || "worker-local-1",
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 5000),
  claimTimeoutMinutes: Number(process.env.WORKER_CLAIM_TIMEOUT_MINUTES || 10),
}

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}
