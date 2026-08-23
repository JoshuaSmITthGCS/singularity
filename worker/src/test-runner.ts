import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Writable } from "node:stream"
import Docker from "dockerode"
import { writeJobFiles } from "./deps.js"
import { parseReport, resolveTestStatus, unverifiedNotice } from "./test-report.js"
import type { Language, TestResult, TranslationDependencies } from "./types.js"

const docker = new Docker()

// Cold dependency restores (Maven, NuGet, a CMake configure+build) do not fit in
// the 30s this used to allow; a timeout here surfaced as an opaque variant
// failure.
const INSTALL_TIMEOUT_MS = 180_000

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
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "singularity-job-"))
  const workspace = path.join(root, "workspace")
  const reports = path.join(root, "reports")

  await fs.mkdir(workspace)
  await fs.mkdir(reports)
  await writeJobFiles({ dir: workspace, language, code, tests, dependencies })

  try {
    if (needsInstallStage(language, dependencies)) {
      const install = await runContainer({
        image: imageByLanguage[language],
        cmd: installCommand(language),
        workspace,
        reports,
        networkMode: "bridge",
        workspaceMode: "rw",
        timeoutMs: INSTALL_TIMEOUT_MS,
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
      workspaceMode: needsWritableWorkspace(language) ? "rw" : "ro",
      timeoutMs: testTimeoutMs(language),
      memory: 512 * 1024 * 1024,
    })

    const parsed = await parseReport(language, reports)
    const status = resolveTestStatus(test.statusCode, parsed)

    return {
      status,
      testsTotal: parsed.total,
      testsPassed: parsed.passed,
      testsFailed: parsed.failed,
      // Say so when the run was unverifiable rather than reporting it as a
      // plain test failure — the two need different fixes.
      output: parsed.failed === null ? `${test.output}\n\n${unverifiedNotice(language)}` : test.output,
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

// Java, C# and C++ always need the install stage: writeJobFiles() writes a
// pom.xml / .csproj / CMakeLists.txt for every job, so there is always a
// restore-or-compile step to run whether or not the model returned a manifest
// of its own. Gating C#/C++ on the model's optional manifest meant a job could
// reach the test stage with nothing built. Node has its runners installed
// globally in the image, so it only needs a stage when deps are declared.
function needsInstallStage(language: Language, dependencies?: TranslationDependencies) {
  if (language === "java" || language === "csharp" || language === "cpp") return true

  return Boolean(dependencies?.package_json)
}

// C# builds the project as part of `dotnet test`, so like Maven it cannot run
// against a read-only bind mount. Network stays off for every test stage — that
// is the boundary that matters.
function needsWritableWorkspace(language: Language) {
  return language === "java" || language === "csharp"
}

// C# compiles inside the test stage, so it needs more headroom than languages
// that arrive pre-built. Everything else keeps the tighter runaway-code bound.
function testTimeoutMs(language: Language) {
  return language === "csharp" ? 120_000 : 60_000
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
    return [
      "sh",
      "-lc",
      "dotnet test --no-restore --results-directory /reports --logger 'trx;LogFileName=test-results.trx'",
    ]
  }

  if (language === "cpp") {
    return ["sh", "-lc", "./build/tests --gtest_output=json:/reports/gtest-results.json"]
  }

  return ["sh", "-lc", "vitest run --reporter=json --outputFile=/reports/report.json"]
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
