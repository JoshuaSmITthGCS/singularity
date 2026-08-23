// Demo mode is the safe default: it takes BOTH switches to reach real services.
// Requiring only one meant a deploy that set just the NEXT_PUBLIC_ half — the
// client-exposed, easy-to-set one — would silently point the server at a
// possibly-unconfigured Supabase. Documented in CLAUDE.md §4.
export function isDemoMode() {
  return !(
    process.env.NEXT_PUBLIC_REAL_BACKEND === "true" &&
    process.env.SINGULARITY_REAL_BACKEND === "true"
  )
}
