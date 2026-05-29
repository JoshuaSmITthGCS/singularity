import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/env"
import { createAccountLink } from "@/lib/whop/client"

// Open Whop's hosted payout portal for the developer's connected company. This
// is how developers withdraw their earned balance — no custom payout rail.
export async function POST() {
  if (isDemoMode()) {
    return dataResponse({ url: `${getAppUrl()}/dashboard?whop=demo-payouts` })
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401)

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("whop_company_id, whop_kyc_complete")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) return errorResponse("Profile is not ready", 400)
  if (!profile.whop_company_id) return errorResponse("Finish payment onboarding first", 409)

  try {
    const url = await createAccountLink({
      companyId: profile.whop_company_id,
      useCase: "payouts_portal",
      returnUrl: `${getAppUrl()}/dashboard`,
      refreshUrl: `${getAppUrl()}/dashboard?whop=refresh`,
    })

    return dataResponse({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open payouts portal"
    return errorResponse(message, 502)
  }
}
