import { dataResponse, errorResponse } from "@/lib/api"
import { getGitHubInstallUrl } from "@/lib/github/app"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  try {
    return dataResponse({ url: getGitHubInstallUrl() })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "GitHub setup is incomplete", 500)
  }
}
