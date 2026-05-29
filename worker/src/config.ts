import path from "node:path"
import { config as loadEnv } from "dotenv"

loadEnv({ path: path.resolve(process.cwd(), "../.env.local") })
loadEnv()

export const workerConfig = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
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
