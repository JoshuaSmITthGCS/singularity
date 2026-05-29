import { createHmac, timingSafeEqual } from "node:crypto"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { getRequiredEnv, normalizePrivateKey } from "@/lib/env"

type RepoParts = {
  owner: string
  repo: string
}

type DeliveryFile = {
  path: string
  content: string
}

function parseRepoFullName(repoFullName: string): RepoParts {
  const [owner, repo] = repoFullName.split("/")

  if (!owner || !repo) {
    throw new Error("Repo must look like owner/name")
  }

  return { owner, repo }
}

export async function getInstallationOctokit(installationId: number) {
  const auth = createAppAuth({
    appId: getRequiredEnv("GITHUB_APP_ID"),
    privateKey: normalizePrivateKey(getRequiredEnv("GITHUB_APP_PRIVATE_KEY")),
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
  })

  const installationAuthentication = await auth({
    type: "installation",
    installationId,
  })

  return new Octokit({
    auth: installationAuthentication.token,
  })
}

export async function listInstallationRepos(installationId: number) {
  const octokit = await getInstallationOctokit(installationId)
  const repos = await octokit.paginate(octokit.apps.listReposAccessibleToInstallation, {})

  return repos.map((repo) => ({
    id: repo.id,
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    private: repo.private,
  }))
}

export async function getRepoPathContent({
  installationId,
  repoFullName,
  path,
}: {
  installationId: number
  repoFullName: string
  path: string
}) {
  const octokit = await getInstallationOctokit(installationId)
  const { owner, repo } = parseRepoFullName(repoFullName)
  const response = await octokit.repos.getContent({
    owner,
    repo,
    path,
  })

  if (Array.isArray(response.data)) {
    return {
      type: "dir" as const,
      entries: response.data.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
      })),
    }
  }

  if (response.data.type !== "file") {
    return {
      type: response.data.type,
      entries: [],
    }
  }

  return {
    type: "file" as const,
    name: response.data.name,
    path: response.data.path,
    content: Buffer.from(response.data.content || "", "base64").toString("utf8"),
  }
}

export async function installationHasRepo(installationId: number, repoFullName: string) {
  const repos = await listInstallationRepos(installationId)

  return repos.some((repo) => repo.full_name.toLowerCase() === repoFullName.toLowerCase())
}

export async function createDeliveryPullRequest({
  installationId,
  repoFullName,
  baseBranch,
  branchName,
  title,
  body,
  files,
}: {
  installationId: number
  repoFullName: string
  baseBranch: string
  branchName: string
  title: string
  body: string
  files: DeliveryFile[]
}) {
  const octokit = await getInstallationOctokit(installationId)
  const { owner, repo } = parseRepoFullName(repoFullName)
  const base = await octokit.repos.getBranch({
    owner,
    repo,
    branch: baseBranch,
  })
  const repoInfo = await octokit.repos.get({
    owner,
    repo,
  })

  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: base.data.commit.sha,
    })
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Reference already exists")) {
      throw error
    }
  }

  for (const file of files) {
    let existingSha: string | undefined

    try {
      const existing = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: branchName,
      })

      if (!Array.isArray(existing.data) && existing.data.type === "file") {
        existingSha = existing.data.sha
      }
    } catch {
      existingSha = undefined
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.path,
      message: `Add ${file.path} from Singularity`,
      content: Buffer.from(file.content).toString("base64"),
      branch: branchName,
      sha: existingSha,
    })
  }

  const pull = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: branchName,
    base: baseBranch,
  })

  return {
    repoId: repoInfo.data.id,
    prUrl: pull.data.html_url,
    prNumber: pull.data.number,
  }
}

export function verifyGitHubSignature({
  body,
  signature,
  secret,
}: {
  body: string
  signature: string | null
  secret: string
}) {
  if (!signature) return false

  const digest = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
  const expected = Buffer.from(digest)
  const actual = Buffer.from(signature)

  if (expected.length !== actual.length) return false

  return timingSafeEqual(expected, actual)
}
