"use client"

import { useEffect } from "react"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <div className="rounded border border-rule bg-surface p-8">
        <p className="tag text-ink-4">Error</p>
        <h1 className="display mt-1.5 text-3xl text-ink">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => reset()} className={buttonVariants()}>
            Try again
          </button>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
