import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { clientEnvConfigSchema } from "@/lib/validation"

// §5.1 client native development environment configuration. This is the
// instruction set the ITE uses to pick target language/engine, unit system,
// naming convention, and delivery mode for all deliveries to this client.

export async function GET() {
  if (isDemoMode()) {
    return dataResponse({
      config: {
        primary_language: "typescript",
        secondary_languages: [],
        target_engine: "generic",
        unit_system: "metric",
        naming_convention: "camelCase",
        pr_mode: true,
        target_branch: "main",
      },
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorResponse("Sign in first", 401, { code: "UNAUTHENTICATED" })

  const { data, error } = await supabase
    .from("client_env_configs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) return errorResponse(error.message, 400, { code: "ENV_CONFIG_READ_FAILED" })

  return dataResponse({ config: data })
}

export async function PUT(request: Request) {
  if (isDemoMode()) {
    const body = await request.json().catch(() => null)
    const parsed = clientEnvConfigSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid env config", 400, {
        code: "ENV_CONFIG_VALIDATION_FAILED",
      })
    }
    return dataResponse({ config: parsed.data })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorResponse("Sign in first", 401, { code: "UNAUTHENTICATED" })

  const body = await request.json().catch(() => null)
  const parsed = clientEnvConfigSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid env config", 400, {
      code: "ENV_CONFIG_VALIDATION_FAILED",
    })
  }

  const { data, error } = await supabase
    .from("client_env_configs")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) return errorResponse(error.message, 400, { code: "ENV_CONFIG_WRITE_FAILED" })

  return dataResponse({ config: data })
}
