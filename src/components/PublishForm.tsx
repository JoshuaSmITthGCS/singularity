"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, FileCode2, Github, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  LANGUAGES,
  LANGUAGE_LABEL,
  SHORT_DESCRIPTION_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
} from "@/lib/constants"
import { COMPLEXITY_LEVELS } from "@/lib/taxonomy"
import { computeAssetPriceCents } from "@/lib/pricing"
import { isDemoMode } from "@/lib/demo-mode"
import { splitTags } from "@/lib/utils"
import type { Complexity, Language } from "@/types/database"

type SourceMode = "paste" | "github"
type Step = "source" | "metadata" | "price" | "confirm"
type RepoOption = {
  id: number
  full_name: string
  default_branch: string
}

const steps: Step[] = ["source", "metadata", "price", "confirm"]
const stepLabel: Record<Step, string> = {
  source: "Source",
  metadata: "Catalog",
  price: "Pricing",
  confirm: "Verify",
}

export function PublishForm() {
  const router = useRouter()
  const demoMode = isDemoMode()
  const [step, setStep] = useState<Step>("source")
  const [mode, setMode] = useState<SourceMode>("paste")
  const [language, setLanguage] = useState<Language>("typescript")
  const [sourceCode, setSourceCode] = useState("")
  const [testCode, setTestCode] = useState("")
  const [sourcePath, setSourcePath] = useState("")
  const [testPath, setTestPath] = useState("")
  const [repos, setRepos] = useState<RepoOption[]>([])
  const [repo, setRepo] = useState("")
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoLoading, setRepoLoading] = useState(false)

  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [summary, setSummary] = useState("")
  const [longDescription, setLongDescription] = useState("")
  const [tags, setTags] = useState("")
  const [complexity, setComplexity] = useState<Complexity>("medium")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = steps.indexOf(step)
  const parsedTags = useMemo(() => splitTags(tags), [tags])

  useEffect(() => {
    if (demoMode && mode === "github" && !repos.length) {
      setRepos([
        {
          id: 1,
          full_name: "studio/demo-gameplay-kit",
          default_branch: "main",
        },
      ])
      setRepo("studio/demo-gameplay-kit")
      return
    }

    if (mode !== "github" || repos.length || repoLoading) return

    setRepoLoading(true)
    fetch("/api/github/repos")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error) {
          setRepoError(payload.error)
          return
        }

        setRepos(payload.data.repos)
        setRepo(payload.data.repos[0]?.full_name ?? "")
      })
      .catch(() => setRepoError("Could not load repos"))
      .finally(() => setRepoLoading(false))
  }, [demoMode, mode, repoLoading, repos.length])

  async function loadRepoFile(kind: "source" | "test") {
    if (demoMode) {
      setRepoError(null)

      if (kind === "source") {
        setSourceCode(
          "export function bufferedAction(pressedFrame: number, currentFrame: number, window = 6) {\n  return currentFrame - pressedFrame <= window\n}\n"
        )
      }

      if (kind === "test") {
        setTestCode(
          "import { describe, expect, it } from 'vitest'\nimport { bufferedAction } from './example'\n\ndescribe('bufferedAction', () => {\n  it('allows actions inside the buffer window', () => {\n    expect(bufferedAction(10, 15)).toBe(true)\n    expect(bufferedAction(10, 20)).toBe(false)\n  })\n})\n"
        )
      }

      return
    }

    const path = kind === "source" ? sourcePath : testPath
    setRepoError(null)

    const response = await fetch(
      `/api/github/files?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
    )
    const payload = await response.json()

    if (!response.ok || payload.error) {
      setRepoError(payload.error ?? "Could not load file")
      return
    }

    if (payload.data.type !== "file") {
      setRepoError("Choose a file path")
      return
    }

    if (kind === "source") setSourceCode(payload.data.content)
    if (kind === "test") setTestCode(payload.data.content)
  }

  function canContinue() {
    if (step === "source") return sourceCode.trim() && testCode.trim()
    if (step === "metadata") {
      return title.trim() && shortDescription.trim() && summary.trim().length >= 40
    }
    if (step === "price") return COMPLEXITY_LEVELS.includes(complexity)

    return true
  }

  function nextStep() {
    const next = steps[currentStepIndex + 1]
    if (next) setStep(next)
  }

  function previousStep() {
    const previous = steps[currentStepIndex - 1]
    if (previous) setStep(previous)
  }

  async function submit() {
    setSaving(true)
    setError(null)

    if (demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setSaving(false)
      router.push("/dashboard?published=demo")
      router.refresh()
      return
    }

    const response = await fetch("/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_type: mode,
        source_language: language,
        title,
        short_description: shortDescription,
        long_description: longDescription || null,
        summary,
        // §4.5 structured tags — keywords carry the freeform tag list; the
        // worker enriches genre/purpose/actions during ingestion.
        tags: { keywords: parsedTags },
        // §7.4 price is computed from complexity + quality, not set here.
        complexity,
        source_path: mode === "github" ? sourcePath : null,
        test_path: mode === "github" ? testPath : null,
        source_code: sourceCode,
        test_code: testCode,
      }),
    })

    const payload = await response.json()
    setSaving(false)

    if (!response.ok || payload.error) {
      setError(payload.error ?? "Could not publish asset")
      return
    }

    router.push(`/dashboard?published=${payload.data.asset.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => setStep(item)}
            className={`h-16 rounded-lg border px-3 text-left transition ${
              index <= currentStepIndex ? "border-primary bg-[var(--primary-soft)]" : "border-border bg-panel"
            }`}
            aria-label={item}
          >
            <span className="block text-xs text-muted-foreground">0{index + 1}</span>
            <span className="block text-sm font-medium">{stepLabel[item]}</span>
          </button>
        ))}
      </div>

      {step === "source" ? (
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left ${
                mode === "paste" ? "border-primary bg-[var(--primary-soft)]" : "border-border bg-panel"
              }`}
            >
              <FileCode2 size={20} aria-hidden />
              <span>
                <span className="block text-sm font-medium">Paste code</span>
                <span className="block text-xs text-muted-foreground">Source and tests in text areas</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("github")}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left ${
                mode === "github" ? "border-primary bg-[var(--primary-soft)]" : "border-border bg-panel"
              }`}
            >
              <Github size={20} aria-hidden />
              <span>
                <span className="block text-sm font-medium">Connect repo file</span>
                <span className="block text-xs text-muted-foreground">Load files from GitHub</span>
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Source language</Label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm"
            >
              {LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {LANGUAGE_LABEL[item]}
                </option>
              ))}
            </select>
          </div>

          {mode === "github" ? (
            <div className="space-y-4 rounded-lg border border-border bg-panel p-4">
              {repoLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Loading repos
                </p>
              ) : null}
              {repoError ? <p className="text-sm text-danger">{repoError}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="repo">Repository</Label>
                <select
                  id="repo"
                  value={repo}
                  onChange={(event) => setRepo(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm"
                >
                  {repos.map((item) => (
                    <option key={item.id} value={item.full_name}>
                      {item.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="sourcePath">Source path</Label>
                  <Input
                    id="sourcePath"
                    value={sourcePath}
                    onChange={(event) => setSourcePath(event.target.value)}
                    placeholder="src/example.ts"
                  />
                </div>
                <Button type="button" variant="secondary" className="self-end" onClick={() => loadRepoFile("source")}>
                  Load source
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="testPath">Test path</Label>
                  <Input
                    id="testPath"
                    value={testPath}
                    onChange={(event) => setTestPath(event.target.value)}
                    placeholder="src/example.test.ts"
                  />
                </div>
                <Button type="button" variant="secondary" className="self-end" onClick={() => loadRepoFile("test")}>
                  Load tests
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sourceCode">Source code</Label>
              <Textarea
                id="sourceCode"
                className="min-h-72 font-mono text-xs"
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testCode">Tests</Label>
              <Textarea
                id="testCode"
                className="min-h-72 font-mono text-xs"
                value={testCode}
                onChange={(event) => setTestCode(event.target.value)}
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === "metadata" ? (
        <section className="space-y-4">
          <Field label="Title" id="title">
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Short description" id="shortDescription" count={`${shortDescription.length}/${SHORT_DESCRIPTION_MAX_LENGTH}`}>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
            />
          </Field>
          <Field label="Public summary" id="summary" count={`${summary.length}/${SUMMARY_MAX_LENGTH}`}>
            <Textarea
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Describe behavior, inputs, outputs, edge cases, and test coverage without exposing the source."
            />
          </Field>
          <Field label="Long description" id="longDescription">
            <Textarea
              id="longDescription"
              value={longDescription}
              onChange={(event) => setLongDescription(event.target.value)}
            />
          </Field>
          <Field label="Tags" id="tags">
            <Input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="math, parsing, api"
            />
          </Field>
        </section>
      ) : null}

      {step === "price" ? (
        <section className="space-y-3">
          <Label htmlFor="complexity">Complexity tier</Label>
          <select
            id="complexity"
            value={complexity}
            onChange={(event) => setComplexity(event.target.value as Complexity)}
            className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm"
          >
            {COMPLEXITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level[0].toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            Pricing is computed from the platform unit-economics formula (complexity tier + verified
            quality score), not set manually. Estimated starting price:{" "}
            <span className="font-medium text-foreground">
              ${(computeAssetPriceCents({ complexity, qualityScore: 0 }) / 100).toFixed(2)}
            </span>{" "}
            (a quality bonus is added after verification). Delivered procurements use the 70/25/5 split.
          </p>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section className="space-y-4 rounded-lg border border-border bg-panel p-5">
          <div>
            <p className="text-sm text-muted-foreground">Asset</p>
            <h2 className="text-xl font-semibold">{title || "Untitled asset"}</h2>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{mode === "github" ? repo : "Pasted code"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Language</dt>
              <dd>{LANGUAGE_LABEL[language]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Complexity</dt>
              <dd>{complexity[0].toUpperCase() + complexity.slice(1)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Est. price</dt>
              <dd>${(computeAssetPriceCents({ complexity, qualityScore: 0 }) / 100).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tags</dt>
              <dd>{parsedTags.join(", ") || "None"}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Publishing starts Stage 1 source verification. The asset appears in the marketplace after source-language tests pass, and checked targets become available for client selection.
          </p>
          {demoMode ? (
            <p className="rounded-md border border-[#9dbed0] bg-[var(--info-soft)] p-3 text-sm text-[var(--info)]">
              Demo mode: this will simulate a successful publish and return to the dashboard.
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={previousStep} disabled={currentStepIndex === 0}>
          <ArrowLeft size={16} aria-hidden />
          Back
        </Button>
        {step === "confirm" ? (
          <Button type="button" onClick={submit} disabled={saving || !canContinue()}>
            <Check size={16} aria-hidden />
            {saving ? "Publishing" : "Publish"}
          </Button>
        ) : (
          <Button type="button" onClick={nextStep} disabled={!canContinue()}>
            Next
            <ArrowRight size={16} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  id,
  count,
  children,
}: {
  label: string
  id: string
  count?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {count ? <span className="text-xs text-muted-foreground">{count}</span> : null}
      </div>
      {children}
    </div>
  )
}
