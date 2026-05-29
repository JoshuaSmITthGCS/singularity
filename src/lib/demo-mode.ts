export function isDemoMode() {
  return (
    process.env.NEXT_PUBLIC_REAL_BACKEND !== "true" &&
    process.env.SINGULARITY_REAL_BACKEND !== "true"
  )
}
