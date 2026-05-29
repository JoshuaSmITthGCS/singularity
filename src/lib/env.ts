export function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n")
}
