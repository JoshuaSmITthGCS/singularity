import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Gamepad2,
  GitBranch,
  Languages,
  Search,
  ShieldCheck,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const steps: Array<[LucideIcon, string, string]> = [
  [GitBranch, "Publish", "Creators submit TypeScript, JavaScript, or Java assets with tests."],
  [Search, "Search", "Clients search by purpose, tags, and verified language compatibility."],
  [Languages, "Adapt", "The worker preserves behavior and checks the selected target."],
  [BadgeCheck, "Ship", "Passing procurements deliver as a download or GitHub PR."],
]

const trustSignals: Array<[LucideIcon, string, string]> = [
  [ShieldCheck, "Stage 1", "Source verification before listing"],
  [Gamepad2, "Beachhead", "Indie scripting and game teams first"],
  [Coins, "Creator split", "70 percent creator share"],
]

export default function Home() {
  return (
    <main>
      <section className="surface-dark relative overflow-hidden border-b border-[#26342d] bg-[var(--code)] text-white">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-[56%] max-w-3xl opacity-80 lg:block">
          <div className="absolute right-8 top-8 w-[420px] rounded-lg border border-white/10 bg-white/5 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 text-sm">
              <span className="font-medium">stage 1 source check</span>
              <span className="text-xs text-white/60">worker-local-1</span>
            </div>
            {[
              ["typescript", "passed", "31/31"],
              ["javascript", "testing", "running"],
              ["java", "queued", "waiting"],
            ].map(([language, status, count]) => (
              <div key={language} className="grid grid-cols-[120px_1fr_80px] items-center gap-3 border-b border-white/10 py-3 text-sm last:border-b-0">
                <code>{language}</code>
                <span className={status === "passed" ? "text-[#8ee0c4]" : "text-[#f0c56b]"}>{status}</span>
                <span className="text-right text-white/60">{count}</span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-8 right-28 w-[360px] rounded-lg border border-white/10 bg-[#18231d] p-4 shadow-2xl">
            <div className="mb-4 text-sm font-medium">client workflow</div>
            <div className="grid gap-2 text-xs text-white/70">
              {["Search by function", "Select verified asset", "Adapt target language", "Verify and ship"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                  <span>{item}</span>
                  <span className="font-mono text-white/50">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl items-center px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-[#e6b76a]">
              Trusted code marketplace for indie scripting
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-normal md:text-7xl">
              Singularity
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              Turn proven scripts into reusable infrastructure. Creators publish once, clients search by need, and the platform adapts verified assets across TypeScript, JavaScript, and Java.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" prefetch={false} className={buttonVariants({ size: "lg" })}>
                Browse marketplace
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/publish" prefetch={false} className={buttonVariants({ variant: "secondary", size: "lg" })}>
                Publish an asset
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {trustSignals.map(([Icon, title, copy]) => (
                <div key={title} className="border-l border-white/10 pl-4">
                  <Icon size={18} className="text-[#e6b76a]" aria-hidden />
                  <p className="mt-2 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase text-muted-foreground">Search, adapt, verify, ship</p>
            <h2 className="mt-1 text-2xl font-semibold">How it works</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            The platform separates creator ingestion from client procurement, ensuring publish-time verification and purchasable verified targets.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map(([Icon, title, copy]) => (
            <div key={title} className="rounded-lg border border-border bg-panel p-5">
              <Icon size={22} className="text-primary" aria-hidden />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
