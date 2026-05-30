import { NextResponse } from "next/server"

// §2.1: liveness probe. Process is up and serving — no dependency checks.
export function GET() {
  return NextResponse.json({ status: "ok", service: "singularity-web" })
}
