import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"

// Public: lists published demo-sample assets for the /try-it "buy as a
// buyer" step. Admin client is safe here — every row is explicitly filtered
// to is_demo_sample=true, content deliberately safe to show publicly.
export async function GET() {
  if (isDemoMode()) {
    return errorResponse("The live try-it demo needs the real backend configured.", 503, {
      code: "DEMO_BACKEND_NOT_CONFIGURED",
    })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("assets")
    .select("id, title, short_description, source_language, price_cents, status")
    .eq("is_demo_sample", true)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return errorResponse(error.message, 400, { code: "DEMO_ASSETS_LIST_FAILED" })

  return dataResponse({ assets: data ?? [] })
}
