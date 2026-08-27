import path from "node:path"
import { config as loadEnv } from "dotenv"

loadEnv({ path: path.resolve(process.cwd(), "../.env.local") })
loadEnv()

export const workerConfig = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5",
  workerId: process.env.WORKER_ID || "worker-local-1",
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 5000),
  claimTimeoutMinutes: Number(process.env.WORKER_CLAIM_TIMEOUT_MINUTES || 10),
  // How many variants to translate+test at once. Each slot runs its own claim
  // loop, so up to this many asset_variants rows (e.g. every non-source
  // language of one asset) get their Claude call and Docker run in parallel
  // instead of queued behind each other. Each slot can briefly need ~1 CPU +
  // 512MB during the Docker test stage (test-runner.ts), so size this to the
  // host, not just the language count -- 3 is a safe default for a modest
  // 2-4GB VM; a beefier host (or LANGUAGES.length, currently 5) can go higher.
  concurrency: Number(process.env.WORKER_CONCURRENCY || 3),
  // For scheduled/CI-style runners (no persistent host to poll from): drain
  // whatever's queued right now, then exit cleanly instead of polling forever.
  exitWhenIdle: process.env.WORKER_EXIT_WHEN_IDLE === "true",
}

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}
