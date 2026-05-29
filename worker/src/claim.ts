import { supabase } from "./db.js"
import type { AssetVariant } from "./types.js"

export async function claimNextVariant(workerId: string, timeoutMinutes: number) {
  const { data, error } = await supabase.rpc("claim_next_variant", {
    p_worker_id: workerId,
    p_timeout_minutes: timeoutMinutes,
  })

  if (error) throw error

  return (data?.[0] ?? null) as AssetVariant | null
}
