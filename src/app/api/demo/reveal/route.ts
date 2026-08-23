import { dataResponse, errorResponse } from "@/lib/api"
import { isDemoMode } from "@/lib/demo-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const bodySchema = z.object({
  assetId: z.string().uuid(),
  targetLanguage: z.enum(["typescript", "javascript", "java", "csharp", "cpp"]),
})

// Public: the /try-it "buy as a buyer" step's mocked purchase. No Whop
// checkout, no procurement/payment rows — this never touches real revenue.
// Only ever reveals code for is_demo_sample assets (fixed, pre-vetted
// snippets meant to be shown), so it never leaks a real developer's
// unpurchased code. A real purchase still requires the real Whop flow.
export async function POST(request: Request) {
  if (isDemoMode()) {
    return errorResponse("The live try-it demo needs the real backend configured.", 503, {
      code: "DEMO_BACKEND_NOT_CONFIGURED",
    })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse("Missing or invalid assetId/targetLanguage", 400, { code: "DEMO_VALIDATION_FAILED" })
  }

  const admin = createAdminClient()

  const { data: asset } = await admin
    .from("assets")
    .select("id, is_demo_sample")
    .eq("id", parsed.data.assetId)
    .eq("is_demo_sample", true)
    .single()

  if (!asset) return errorResponse("Demo asset not found", 404, { code: "DEMO_ASSET_NOT_FOUND" })

  const { data: variant } = await admin
    .from("asset_variants")
    .select("status, translated_code, translated_tests, notes_for_pr, adaptation_log")
    .eq("asset_id", parsed.data.assetId)
    .eq("target_language", parsed.data.targetLanguage)
    .single()

  if (!variant || variant.status !== "passed") {
    return errorResponse("This language variant hasn't passed verification yet", 409, {
      code: "DEMO_VARIANT_NOT_READY",
    })
  }

  return dataResponse({
    code: variant.translated_code,
    tests: variant.translated_tests,
    notes: variant.notes_for_pr,
    adaptation_log: variant.adaptation_log,
  })
}
