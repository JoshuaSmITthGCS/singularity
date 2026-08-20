import fs from "node:fs/promises"
import path from "node:path"
import { Writable } from "node:stream"
import Docker from "dockerode"
import { workerConfig } from "./config.js"
import { writeJobFiles } from "./deps.js"
import type { Language, TestResult, TranslationDependencies } from "./types.js"

const docker = new Docker()

const imageByLanguage: Record<Language, string> = {
  javascript: "singularity-node-runner",
  typescript: "singularity-typescript-runner",
  java: "singularity-java-runner",
  csharp: "singularity-csharp-runner",
  cpp: "singularity-cpp-runner",
}

export async function runTests({
  language,
  code,
  tests,
  dependencies,
}: {
  language: Language
  code: string
  tests: string
  dependencies?: TranslationDependencies
}): Promise<TestResult> {
  const root = await fs.mkdtemp(path.join(workerConfig.jobTmpDir, "singularity-job-"))
  const workspace = path.join(root, "workspace")
  const reports = path.join(root, "reports")

  await fs.mkdir(workspace)
  await fs.mkdir(reports)
  await writeJobFiles({ dir: workspace, language, code, tests, dependencies })

  try {
    if (hasDependencies(language, dependencies)) {
      const install = await runContainer({
        image: imageByLanguage[language],
        cmd: installCommand(language),
        workspace,
        reports,
        networkMode: "bridge",
        workspaceMode: "rw",
        timeoutMs: 30_000,
        memory: 256 * 1024 * 1024,
      })

      if (install.statusCode !== 0) {
        return {
          status: "failed",
          testsTotal: null,
          testsPassed: null,
          testsFailed: null,
          output: `dependency install failed\n${install.output}`,
        }
      }
    }

    const test = await runContainer({
      image: imageByLanguage[language],
      cmd: testCommand(language),
      workspace,
      reports,
      networkMode: "none",
      workspaceMode: language === "java" ? "rw" : "ro",
      timeoutMs: 60_000,
      memory: 512 * 1024 * 1024,
    })

    const parsed = await parseReport(language, reports)
    const status = test.statusCode === 0 && parsed.failed === 0 ? "passed" : "failed"

    return {
      status,
      testsTotal: parsed.total,
      testsPassed: parsed.passed,
      testsFailed: parsed.failed,
      output: test.output,
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

function hasDependencies(language: Language, dependencies?: TranslationDependencies) {
  if (language === "java") return true
  if (language === "csharp") return Boolean(dependencies?.csproj)
  if (language === "cpp") return Boolean(dependencies?.cmake)

  return Boolean(dependencies?.package_json)
}

function installCommand(language: Language) {
  if (language === "java") {
    return ["sh", "-lc", "mvn -q -Dmaven.repo.local=/workspace/.m2 -DskipTests dependency:go-offline"]
  }

  if (language === "csharp") {
    return ["sh", "-lc", "dotnet restore"]
  }

  if (language === "cpp") {
    return ["sh", "-lc", "cmake -B build -S . -G Ninja && cmake --build build"]
  }

  return ["sh", "-lc", "pnpm install --ignore-scripts"]
}

function testCommand(language: Language) {
  if (language === "java") {
    return [
      "sh",
      "-lc",
      "mvn -q -Dmaven.repo.local=/workspace/.m2 -Dsurefire.reportsDirectory=/reports/surefire-reports test",
    ]
  }

  if (language === "csharp") {
    return ["sh", "-lc", "dotnet test --logger 'trx;LogFileName=/reports/test-results.trx'"]
  }

  if (language === "cpp") {
    return ["sh", "-lc", "./build/tests --gtest_output=json:/reports/gtest-results.json"]
  }

  return ["sh", "-lc", "vitest run --reporter=json --outputFile=/reports/report.json"]
}

async function parseReport(language: Language, reports: string) {
  const reportPath = path.join(reports, "report.json")

  try {
    const raw = await fs.readFile(reportPath, "utf8")
    const report = JSON.parse(raw)

    return {
      total: report.numTotalTests ?? null,
      passed: report.numPassedTests ?? null,
      failed: report.numFailedTests ?? null,
    }
  } catch {
    if (language === "java") {
      return parseSurefireReports(reports)
    }

    return {
      total: null,
      passed: null,
      failed: null,
    }
  }
}

async function parseSurefireReports(reports: string) {
  const surefireDir = path.join(reports, "surefire-reports")

  try {
    const files = await fs.readdir(surefireDir)
    const xmlReports = files.filter((file) => file.endsWith(".xml"))
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

    return {
      total,
      passed: total - failed,
      failed,
    }
  } catch {
    return {
      total: null,
      passed: null,
      failed: null,
    }
  }
}

async function runContainer({
  image,
  cmd,
  workspace,
  reports,
  networkMode,
  workspaceMode,
  timeoutMs,
  memory,
}: {
  image: string
  cmd: string[]
  workspace: string
  reports: string
  networkMode: "bridge" | "none"
  workspaceMode: "ro" | "rw"
  timeoutMs: number
  memory: number
}) {
  const container = await docker.createContainer({
    Image: image,
    Cmd: cmd,
    WorkingDir: "/workspace",
    User: "1000:1000",
    Env: ["CI=1"],
    HostConfig: {
      NetworkMode: networkMode,
      Binds: [`${workspace}:/workspace:${workspaceMode}`, `${reports}:/reports:rw`],
      Memory: memory,
      NanoCpus: 1_000_000_000,
      // T2.1 sandbox lockdown: caps + no-new-privileges close off privilege
      // escalation from translated code we don't control; PidsLimit stops a
      // fork bomb (`while(true) fork()`) from starving the host; Ulimits and
      // a tmpfs /tmp bound the blast radius of a single hostile test writing
      // an oversized file. fsize is 256 MB rather than the ~64 MB a stricter
      // profile would use — Java/C++ builds occasionally emit single
      // artifacts (debug symbols, uber-jars) larger than 64 MB, and this is
      // guarding against a deliberate multi-GB fill, not shaving legitimate
      // headroom.
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      PidsLimit: 256,
      Ulimits: [
        { Name: "nofile", Soft: 1024, Hard: 1024 },
        { Name: "fsize", Soft: 268_435_456, Hard: 268_435_456 },
      ],
      Tmpfs: { "/tmp": "rw,size=64m" },
    },
  })

  let output = ""
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  })

  const stream = await container.attach({
    stream: true,
    stdout: true,
    stderr: true,
  })

  docker.modem.demuxStream(stream, sink, sink)

  const killTimer = setTimeout(() => {
    container.kill().catch(() => undefined)
  }, timeoutMs)

  try {
    await container.start()
    const result = await container.wait()

    return {
      statusCode: result.StatusCode,
      output,
    }
  } finally {
    clearTimeout(killTimer)
    await container.remove({ force: true }).catch(() => undefined)
  }
}
