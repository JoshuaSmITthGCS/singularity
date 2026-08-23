import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { LANGUAGES, LANGUAGE_LABEL, LANGUAGE_ENGINE_TAGS, DEVELOPER_SHARE_RATE } from "@/lib/constants"

// The pitch is a claim about evidence, so the page argues it the way the product
// does: state the rule, then show the run that enforces it.
const pipeline: Array<[string, string, string]> = [
  ["01", "Publish once", "Push source and its tests in whichever language you already wrote them in."],
  ["02", "Translate", "Claude ports code and tests across the matrix, adapting engine APIs, unit scales, and coordinate systems."],
  ["03", "Run the tests", "Every translation executes in a sandboxed container for its language. Network off, filesystem read-only."],
  ["04", "List what passed", "Failing targets never reach the marketplace. Buyers only see green."],
]

// Illustrative of a typical run — the live numbers come from the marketplace.
const sampleRun: Array<[string, "pass" | "fail", string]> = [
  ["typescript", "pass", "48/48"],
  ["javascript", "pass", "48/48"],
  ["csharp", "pass", "46/46"],
  ["cpp", "pass", "46/46"],
  ["java", "fail", "41/48"],
]

export default function Home() {
  return (
    <main>
      <section className="grid-paper border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="max-w-xl">
            <p className="tag text-ink-4">Verified code marketplace · game development</p>
            <h1 className="display mt-4 text-[2.75rem] leading-[1.08] text-ink md:text-[3.5rem]">
              Nobody ships you code that
              <em className="not-italic text-accent"> hasn&rsquo;t passed its tests</em> in your
              language.
            </h1>
            <p className="mt-5 text-lg leading-8 text-ink-2">
              Buy gameplay systems in {LANGUAGE_LABEL.csharp} for Unity, {LANGUAGE_LABEL.cpp} for
              Unreal, or {LANGUAGE_LABEL.typescript} for the web. Each one was translated from a
              working original and re-tested in a sandbox before it was listed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link href="/marketplace" className={buttonVariants({ size: "lg" })}>
                Browse the marketplace
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href="/publish"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Publish an asset
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-3">
              Creators keep {Math.round(DEVELOPER_SHARE_RATE * 100)}% of every sale.
            </p>
          </div>

          <RunCard />
        </div>
      </section>

      <section className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="display text-2xl text-ink">How a listing earns its badge</h2>
          <ol className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {pipeline.map(([number, title, copy]) => (
              <li key={number} className="border-t border-rule-strong pt-4">
                <span className="mono text-xs text-accent">{number}</span>
                <h3 className="mt-2 text-[0.9375rem] font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-2">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="display text-2xl text-ink">Five languages, and the engines behind them</h2>
          <p className="max-w-md text-sm leading-6 text-ink-2">
            Translation is engine-aware: coordinate systems, unit scales, gravity constants, and API
            calls get adapted, not transliterated.
          </p>
        </div>
        <div className="mt-7 overflow-hidden rounded border border-rule bg-surface">
          {LANGUAGES.map((language) => (
            <div
              key={language}
              className="flex flex-col gap-1.5 border-b border-rule px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-5"
            >
              <span className="mono w-28 shrink-0 text-sm text-ink">
                {LANGUAGE_LABEL[language]}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {LANGUAGE_ENGINE_TAGS[language].map((engine) => (
                  <span
                    key={engine}
                    className="rounded border border-rule bg-sunken px-1.5 py-0.5 text-xs text-ink-3"
                  >
                    {engine}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

// A verification run rendered as the artifact it is. Sells the product better
// than an abstract illustration because it is exactly what buyers will read.
function RunCard() {
  return (
    <div className="mt-12 overflow-hidden rounded border border-rule bg-surface shadow-[0_1px_2px_rgba(20,20,26,0.04),0_12px_32px_-12px_rgba(20,20,26,0.18)] lg:mt-0">
      <div className="flex items-center justify-between border-b border-rule bg-sunken px-3.5 py-2.5">
        <span className="mono text-xs text-ink-2">spatial-audio-occlusion</span>
        <span className="tag text-ink-4">run #128</span>
      </div>
      <ul className="divide-y divide-rule">
        {sampleRun.map(([language, state, count]) => (
          <li key={language} className="flex items-center gap-3 px-3.5 py-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                state === "pass" ? "bg-[var(--pass)]" : "bg-[var(--fail)]"
              }`}
              aria-hidden
            />
            <span className="mono text-[0.8125rem] text-ink">{language}</span>
            <span
              className={`mono tabular ml-auto text-xs ${
                state === "pass" ? "text-[var(--pass)]" : "text-[var(--fail)]"
              }`}
            >
              {count} {state === "pass" ? "passed" : "passed"}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-rule bg-sunken px-3.5 py-2.5 text-xs leading-5 text-ink-2">
        <span className="font-medium text-ink">Java is withheld from sale.</span> Seven tests failed
        on translation, so that target never lists.
      </p>
    </div>
  )
}
