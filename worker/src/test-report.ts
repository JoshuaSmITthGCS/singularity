import fs from "node:fs/promises"
import path from "node:path"
import type { Language } from "./types.js"

// Parsing verification reports is the load-bearing step of the whole product:
// a variant is only sellable when we can prove its suite ran and every test in
// it passed. Each language's runner writes a different report in a different
// format, so each needs its own parser — a missing parser silently reads as
// "unverified", which is why this lives in its own module with its own tests.

export type ParsedReport = {
  total: number | null
  passed: number | null
  failed: number | null
}

const REPORT_FILE: Record<Language, string> = {
  javascript: "report.json",
  typescript: "report.json",
  java: "surefire-reports/*.xml",
  csharp: "test-results.trx",
  cpp: "gtest-results.json",
}

export function reportFileFor(language: Language) {
  return REPORT_FILE[language]
}

export async function parseReport(language: Language, reports: string): Promise<ParsedReport> {
  if (language === "csharp") return parseTrxReport(reports)
  if (language === "cpp") return parseGoogleTestReport(reports)
  if (language === "java") return parseSurefireReports(reports)

  return parseVitestReport(reports)
}

// A variant may only be marked `passed` when the report proves it. An
// unparsable report means the run could not be verified — which is not the same
// thing as a test failing, but must never be sold as a pass either. Note the
// explicit null check: `null === 0` is false, so folding the two cases together
// silently fails every language whose report we cannot read.
export function resolveTestStatus(exitCode: number, parsed: ParsedReport): "passed" | "failed" {
  if (parsed.failed === null) return "failed"

  return exitCode === 0 && parsed.failed === 0 ? "passed" : "failed"
}

export function unverifiedNotice(language: Language) {
  return `[verification] no readable ${REPORT_FILE[language]} report was produced, so this run could not be verified.`
}

// Vitest `--reporter=json` writes Jest-shaped totals.
async function parseVitestReport(reports: string): Promise<ParsedReport> {
  try {
    const raw = await fs.readFile(path.join(reports, "report.json"), "utf8")
    const report = JSON.parse(raw)

    return {
      total: report.numTotalTests ?? null,
      passed: report.numPassedTests ?? null,
      failed: report.numFailedTests ?? null,
    }
  } catch {
    return unreadableReport()
  }
}

// VSTest writes a TRX file whose <ResultSummary><Counters/> element carries the
// totals. Attribute order is not guaranteed, so read each one by name.
async function parseTrxReport(reports: string): Promise<ParsedReport> {
  try {
    const raw = await fs.readFile(path.join(reports, "test-results.trx"), "utf8")
    const counters = raw.match(/<Counters\b[^>]*>/)?.[0]

    if (!counters) return unreadableReport()

    const attribute = (name: string) => Number(counters.match(new RegExp(`\\b${name}="(\\d+)"`))?.[1] ?? 0)
    const total = attribute("total")
    // `failed` is only assertion failures; error/timeout/aborted are separate
    // TRX outcomes and none of them may be counted as a pass.
    const failed =
      attribute("failed") + attribute("error") + attribute("timeout") + attribute("aborted")

    return { total, passed: Math.max(0, total - failed), failed }
  } catch {
    return unreadableReport()
  }
}

// GoogleTest `--gtest_output=json:` writes totals at the top level of the
// document, alongside the per-suite breakdown we do not need.
async function parseGoogleTestReport(reports: string): Promise<ParsedReport> {
  try {
    const raw = await fs.readFile(path.join(reports, "gtest-results.json"), "utf8")
    const report = JSON.parse(raw)

    const total = Number(report.tests ?? 0)
    const failed = Number(report.failures ?? 0) + Number(report.errors ?? 0)

    return { total, passed: Math.max(0, total - failed), failed }
  } catch {
    return unreadableReport()
  }
}

async function parseSurefireReports(reports: string): Promise<ParsedReport> {
  const surefireDir = path.join(reports, "surefire-reports")

  try {
    const files = await fs.readdir(surefireDir)
    const xmlReports = files.filter((file) => file.endsWith(".xml"))

    if (xmlReports.length === 0) return unreadableReport()

    let total = 0
    let failed = 0

    for (const file of xmlReports) {
      const raw = await fs.readFile(path.join(surefireDir, file), "utf8")
      const tests = Number(raw.match(/\btests="(\d+)"/)?.[1] ?? 0)
      const failures = Number(raw.match(/\bfailures="(\d+)"/)?.[1] ?? 0)
      const errors = Number(raw.match(/\berrors="(\d+)"/)?.[1] ?? 0)

      total += tests
      failed += failures + errors
    }

    return { total, passed: total - failed, failed }
  } catch {
    return unreadableReport()
  }
}

function unreadableReport(): ParsedReport {
  return { total: null, passed: null, failed: null }
}
