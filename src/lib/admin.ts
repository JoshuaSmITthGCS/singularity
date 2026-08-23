// Server-only. ADMIN_USER_ID deliberately has no NEXT_PUBLIC_ prefix and must
// never be checked from client code — see AuthButton.tsx's comment on why a
// client-side env check silently reads server-only vars as undefined.
export function isAdminUser(userId: string | null | undefined) {
  const adminId = process.env.ADMIN_USER_ID
  return Boolean(adminId && userId && userId === adminId)
}
