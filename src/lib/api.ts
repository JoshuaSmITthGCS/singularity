import { NextResponse } from "next/server"

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init)
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ data: null, error }, { status })
}
