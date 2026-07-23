import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const __dirname = dirname(fileURLToPath(import.meta.url))

// T2.2 security headers. CSP is intentionally permissive on connect-src (self
// + Supabase + Whop) since the buyer flow redirects to Whop's hosted checkout
// and the app calls Supabase directly from the browser; tighten further once
// the exact Whop checkout domain is confirmed (T1.2).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // CSP only in production: Turbopack's dev-mode HMR needs 'unsafe-eval', and
  // there's no live traffic to protect locally anyway.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://*.whop.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self' https://*.whop.com",
          ].join("; "),
        },
      ]
    : []),
]

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
