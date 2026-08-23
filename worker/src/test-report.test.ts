import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { parseReport, resolveTestStatus, type ParsedReport } from "./test-report.js"

let reports: string

beforeEach(async () => {
  reports = await fs.mkdtemp(path.join(os.tmpdir(), "singularity-reports-"))
})

afterEach(async () => {
  await fs.rm(reports, { recursive: true, force: true })
})

async function write(file: string, contents: string) {
  const target = path.join(reports, file)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, contents)
}

const unreadable: ParsedReport = { total: null, passed: null, failed: null }

describe("parseReport", () => {
  it("reads vitest json totals", async () => {
    await write("report.json", JSON.stringify({ numTotalTests: 8, numPassedTests: 7, numFailedTests: 1 }))

    expect(await parseReport("typescript", reports)).toEqual({ total: 8, passed: 7, failed: 1 })
  })

  it("reads the C# trx counters regardless of attribute order", async () => {
    await write(
      "test-results.trx",
      `<?xml version="1.0" encoding="UTF-8"?>
<TestRun id="a1" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
  <ResultSummary outcome="Failed">
    <Counters passed="4" total="6" executed="6" failed="2" error="0" timeout="0" aborted="0" />
  </ResultSummary>
</TestRun>`
    )

    expect(await parseReport("csharp", reports)).toEqual({ total: 6, passed: 4, failed: 2 })
  })

  it("counts C# errors, timeouts and aborts as failures, not passes", async () => {
    await write(
      "test-results.trx",
      `<TestRun><ResultSummary><Counters total="5" failed="1" error="1" timeout="1" aborted="1" /></ResultSummary></TestRun>`
    )

    expect(await parseReport("csharp", reports)).toEqual({ total: 5, passed: 1, failed: 4 })
  })

  it("reads googletest json totals", async () => {
    await write(
      "gtest-results.json",
      JSON.stringify({ tests: 12, failures: 2, errors: 1, disabled: 0, testsuites: [] })
    )

    expect(await parseReport("cpp", reports)).toEqual({ total: 12, passed: 9, failed: 3 })
  })

  it("sums surefire xml across report files", async () => {
    await write("surefire-reports/A.xml", `<testsuite tests="4" failures="1" errors="0" />`)
    await write("surefire-reports/B.xml", `<testsuite tests="3" failures="0" errors="1" />`)

    expect(await parseReport("java", reports)).toEqual({ total: 7, passed: 5, failed: 2 })
  })

  it("reports every language as unreadable when its report is absent", async () => {
    for (const language of ["typescript", "javascript", "java", "csharp", "cpp"] as const) {
      expect(await parseReport(language, reports)).toEqual(unreadable)
    }
  })

  it("treats a malformed report as unreadable rather than as zero failures", async () => {
    await write("gtest-results.json", "{ this is not json")

    expect(await parseReport("cpp", reports)).toEqual(unreadable)
  })
})

// The bug this module exists to close: a green C# or C++ suite resolved to
// "failed" because no parser matched its report, which made both languages
// permanently unsellable. Assert the whole path, parse through status.
describe("a green run is sellable in every language", () => {
  it("passes C# when the trx shows no failures", async () => {
    await write(
      "test-results.trx",
      `<TestRun><ResultSummary><Counters total="9" executed="9" passed="9" failed="0" error="0" timeout="0" aborted="0" /></ResultSummary></TestRun>`
    )

    const parsed = await parseReport("csharp", reports)
    expect(resolveTestStatus(0, parsed)).toBe("passed")
    expect(parsed).toEqual({ total: 9, passed: 9, failed: 0 })
  })

  it("passes C++ when the googletest report shows no failures", async () => {
    await write("gtest-results.json", JSON.stringify({ tests: 4, failures: 0, errors: 0 }))

    const parsed = await parseReport("cpp", reports)
    expect(resolveTestStatus(0, parsed)).toBe("passed")
    expect(parsed).toEqual({ total: 4, passed: 4, failed: 0 })
  })
})

describe("resolveTestStatus", () => {
  it("passes a clean run", () => {
    expect(resolveTestStatus(0, { total: 6, passed: 6, failed: 0 })).toBe("passed")
  })

  it("fails when tests failed", () => {
    expect(resolveTestStatus(1, { total: 6, passed: 4, failed: 2 })).toBe("failed")
  })

  it("fails when the suite failed but the runner still exited zero", () => {
    expect(resolveTestStatus(0, { total: 6, passed: 4, failed: 2 })).toBe("failed")
  })

  it("fails a nonzero exit even when the report shows no failures", () => {
    // A crash after the last assertion still leaves the variant unsellable.
    expect(resolveTestStatus(139, { total: 6, passed: 6, failed: 0 })).toBe("failed")
  })

  // Regression: `null === 0` is false, so folding the unreadable-report case in
  // with the pass check marked every C# and C++ variant failed even when its
  // suite was green. Both languages are now parsed, but the guard must stay
  // explicit — an unverifiable run is never a pass.
  it("never passes a run whose report could not be read", () => {
    expect(resolveTestStatus(0, unreadable)).toBe("failed")
  })
})
