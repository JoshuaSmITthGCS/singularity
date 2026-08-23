import Link from "next/link"
import { Code2 } from "lucide-react"
import { AuthButton } from "@/components/AuthButton"
import { isDemoMode } from "@/lib/demo-mode"
import { createClient } from "@/lib/supabase/server"

export async function SiteHeader() {
  const demoMode = isDemoMode()
  let signedIn = false

  if (!demoMode) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      signedIn = Boolean(user)
    } catch {
      signedIn = false
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-panel/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Code2 size={19} aria-hidden />
          </span>
          <span>
            <span className="block leading-5">Singularity</span>
            <span className="hidden text-xs font-normal text-muted-foreground sm:block">Verified code reuse</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/marketplace" prefetch={false} className="hover:text-foreground">
            Search
          </Link>
          <Link href="/try-it" prefetch={false} className="hover:text-foreground">
            Try it
          </Link>
          <Link href="/publish" prefetch={false} className="hover:text-foreground">
            Publish
          </Link>
          <Link href="/dashboard" prefetch={false} className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/procurements" prefetch={false} className="hover:text-foreground">
            Procurements
          </Link>
        </nav>
        <AuthButton signedIn={signedIn} />
      </div>
    </header>
  )
}
