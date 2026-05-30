import { NextResponse } from "next/server"
import { hasSupabaseEnv } from "@/lib/env-validation"
import { isDemoMode } from "@/lib/demo-mode"

// §2.1: readiness probe. Reports whether required backing config is present so
// Kubernetes only routes traffic once the service can actually serve requests.
export function GET() {
  const ready = isDemoMode() || hasSupabaseEnv()

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: { supabase: isDemoMode() ? "demo" : hasSupabaseEnv() ? "ok" : "missing" },
    },
    { status: ready ? 200 : 503 }
  )
}
