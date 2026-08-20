import os from "node:os"
import path from "node:path"
import { config as loadEnv } from "dotenv"

loadEnv({ path: path.resolve(process.cwd(), "../.env.local") })
loadEnv()

export const workerConfig = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
  // Cost tiering: translate with Sonnet by default (~5× cheaper than Opus per
  // token); if the Sonnet translation fails verification, retry once with the
  // escalation model before marking the variant failed. Set the escalation
  // model equal to ANTHROPIC_MODEL to disable escalation.
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  anthropicEscalationModel: process.env.ANTHROPIC_ESCALATION_MODEL || "claude-opus-4-8",
  workerId: process.env.WORKER_ID || "worker-local-1",
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 5000),
  claimTimeoutMinutes: Number(process.env.WORKER_CLAIM_TIMEOUT_MINUTES || 10),
  // Base directory for per-job workspace/reports dirs (test-runner.ts). When
  // the worker itself runs in a container talking to the *host's* Docker
  // socket (Docker-outside-of-Docker — see worker/DEPLOY.md), a bind mount
  // it requests is resolved by the host daemon against the host filesystem,
  // not this container's. So this must be a path backed by a volume shared
  // at the *same path* on both the worker container and the host — plain
  // os.tmpdir() only works when the worker runs directly on the host.
  jobTmpDir: process.env.WORKER_JOB_TMP_DIR || os.tmpdir(),
}

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}
