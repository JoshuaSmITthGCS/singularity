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
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="rounded-lg border border-border bg-panel p-8">
        <h1 className="text-3xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-4 text-muted-foreground">
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
