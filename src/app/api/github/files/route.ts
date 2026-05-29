import { dataResponse, errorResponse } from "@/lib/api"
import { getRepoPathContent } from "@/lib/github/octokit"
import { createClient } from "@/lib/supabase/server"
import { githubFilesQuerySchema } from "@/lib/validation"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const url = new URL(request.url)
  const parsed = githubFilesQuerySchema.safeParse({
    repo: url.searchParams.get("repo"),
    path: url.searchParams.get("path") ?? "",
  })

  if (!parsed.success) return errorResponse("Repo path is invalid", 400)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("github_installation_id")
    .eq("id", user.id)
    .single()

  if (profileError) return errorResponse("Profile is not ready", 400)
  if (!profile.github_installation_id) return errorResponse("Install the GitHub App first", 400)

  try {
    const content = await getRepoPathContent({
      installationId: profile.github_installation_id,
      repoFullName: parsed.data.repo,
      path: parsed.data.path,
    })

    return dataResponse(content)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Could not read repo path", 500)
  }
}
