import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/env"
import { createAccountLink, createConnectedCompany } from "@/lib/whop/client"

// Developer payment onboarding. Creates a connected Whop company (once) and
// returns a hosted KYC onboarding link. Developers must complete this before
// their assets can be sold, since payments are split to their connected balance.
export async function POST() {
  if (isDemoMode()) {
    return dataResponse({ url: `${getAppUrl()}/dashboard?whop=demo`, already_connected: false })
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("display_name, github_username, whop_company_id, whop_kyc_complete")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) return errorResponse("Profile is not ready", 400)

  // Already fully onboarded — nothing to do.
  if (profile.whop_company_id && profile.whop_kyc_complete) {
    return dataResponse({ url: `${getAppUrl()}/dashboard`, already_connected: true })
  }

  try {
    let companyId = profile.whop_company_id
    if (!companyId) {
      companyId = await createConnectedCompany({
        email: user.email ?? `${user.id}@users.singularity.app`,
        title: `${profile.display_name ?? profile.github_username ?? "Developer"}'s assets`,
      })
      await admin.from("profiles").update({ whop_company_id: companyId }).eq("id", user.id)
    }

    const url = await createAccountLink({
      companyId,
      useCase: "account_onboarding",
      returnUrl: `${getAppUrl()}/dashboard?whop=connected`,
      refreshUrl: `${getAppUrl()}/dashboard?whop=refresh`,
    })

    return dataResponse({ url, already_connected: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Whop onboarding"
    return errorResponse(message, 502)
  }
}
