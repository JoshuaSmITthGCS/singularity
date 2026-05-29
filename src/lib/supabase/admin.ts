import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getRequiredEnv } from "@/lib/env"

export function createAdminClient() {
  return createSupabaseClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
