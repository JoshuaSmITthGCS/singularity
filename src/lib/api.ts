import { NextResponse } from "next/server"

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init)
}

// Standardized error envelope (TRD §8.2). Never leak stack traces, internal
// paths, or DB error messages.
//
// `error` stays a human-readable string for backward compatibility with
// existing clients; `error_detail` carries the structured §8.2 object
// (machine-readable code, request_id for log correlation, docs link).
export type ApiErrorDetails = Record<string, unknown>

export function errorResponse(
  message: string,
  status = 400,
  options?: { code?: string; details?: ApiErrorDetails; headers?: Record<string, string> }
) {
  const code = options?.code ?? defaultCodeForStatus(status)
  const requestId = `req_${cryptoRandom()}`

  return NextResponse.json(
    {
      data: null,
      error: message,
      error_detail: {
        code,
        message,
        details: options?.details ?? null,
        request_id: requestId,
        documentation_url: `https://docs.singularity.io/errors/${code}`,
      },
    },
    {
      status,
      headers: {
        // AUTH-001: unauthenticated requests must carry WWW-Authenticate.
        ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : null),
        ...options?.headers,
      },
    }
  )
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST"
    case 401:
      return "UNAUTHENTICATED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 409:
      return "CONFLICT"
    case 502:
      return "UPSTREAM_ERROR"
    default:
      return "INTERNAL_ERROR"
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 14).toUpperCase()
}
