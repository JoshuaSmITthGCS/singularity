import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const __dirname = dirname(fileURLToPath(import.meta.url))
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Skip linting during build on Netlify (run it separately in CI/CD)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip type checking during build (run it separately in CI/CD)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
