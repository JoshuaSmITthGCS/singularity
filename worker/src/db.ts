import { createClient } from "@supabase/supabase-js"
import { workerConfig } from "./config.js"

export const supabase = createClient(workerConfig.supabaseUrl, workerConfig.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
