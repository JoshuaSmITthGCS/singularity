import { dataResponse, errorResponse } from "@/lib/api"
import { isAdminUser } from "@/lib/admin"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"
import { isValidMacAddress, sendMagicPacket } from "@/lib/wol"

// Personal utility, not a marketplace feature — restricted to ADMIN_USER_ID
// so no signed-in buyer/developer can trigger it. Target is env-configured
// (WOL_TARGET_HOST/PORT/MAC), not request input: this fires exactly one
// packet at one pre-approved destination, never an arbitrary host.
export async function POST() {
  if (isDemoMode()) {
    return errorResponse("Wake-on-LAN needs the real backend configured.", 501, { code: "DEMO_MODE" })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Sign in first", 401, { code: "UNAUTHENTICATED" })
  if (!isAdminUser(user.id)) {
    return errorResponse("Restricted to the platform admin account.", 403, { code: "FORBIDDEN" })
  }

  const mac = process.env.WOL_TARGET_MAC
  const host = process.env.WOL_TARGET_HOST
  const port = Number(process.env.WOL_TARGET_PORT ?? 9)

  if (!mac || !host || !isValidMacAddress(mac) || !Number.isInteger(port) || port <= 0) {
    return errorResponse(
      "WOL_TARGET_MAC / WOL_TARGET_HOST / WOL_TARGET_PORT are not configured correctly.",
      500,
      { code: "MISCONFIGURED" }
    )
  }

  try {
    await sendMagicPacket(mac, host, port)
  } catch {
    return errorResponse("Failed to send the wake packet.", 502, { code: "UPSTREAM_ERROR" })
  }

  return dataResponse({ sent: true, host, port })
}
