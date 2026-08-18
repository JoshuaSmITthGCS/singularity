import { NextResponse } from "next/server"
import { hasSupabaseEnv } from "@/lib/env-validation"
import { isDemoMode } from "@/lib/demo-mode"
import { hasWhopEnv } from "@/lib/whop/config"
import { pingPlatformCompany } from "@/lib/whop/client"
import { hasGitHubAppEnv } from "@/lib/github/app"

// §2.1 readiness probe. Reports whether required backing config is present —
// and, for Whop, whether the credentials actually authenticate — so it
// doubles as a one-URL "is everything actually connected" check.
//
// Only `supabase` gates the overall ready/not_ready status: Whop and the
// GitHub App degrade gracefully (checkout/GitHub-publish just error until
// configured) rather than taking the whole site down.
export async function GET() {
  const demo = isDemoMode()

  const supabaseStatus = demo ? "demo" : hasSupabaseEnv() ? "ok" : "missing"
  const githubAppStatus = demo ? "demo" : hasGitHubAppEnv() ? "ok" : "missing"
  const whopStatus = await checkWhop(demo)

  const ready = demo || hasSupabaseEnv()

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        supabase: supabaseStatus,
        whop: whopStatus,
        github_app: githubAppStatus,
      },
    },
    { status: ready ? 200 : 503 }
  )
}

async function checkWhop(demo: boolean): Promise<"demo" | "ok" | "unreachable" | "missing"> {
  if (demo) return "demo"
  if (!hasWhopEnv()) return "missing"
  return (await pingPlatformCompany()) ? "ok" : "unreachable"
}
