import { dataResponse, errorResponse } from "@/lib/api"
import { listInstallationRepos } from "@/lib/github/octokit"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("github_installation_id")
    .eq("id", user.id)
    .single()

  if (profileError) return errorResponse("Profile is not ready", 400)
  if (!profile.github_installation_id) return errorResponse("Install the GitHub App first", 400)

  try {
    const repos = await listInstallationRepos(profile.github_installation_id)

    await supabase.from("repos").upsert(
      repos.map((repo) => ({
        owner_id: user.id,
        github_repo_id: repo.id,
        github_full_name: repo.full_name,
        default_branch: repo.default_branch,
      })),
      { onConflict: "owner_id,github_repo_id" }
    )

    return dataResponse({ repos })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Could not list repos", 500)
  }
}
