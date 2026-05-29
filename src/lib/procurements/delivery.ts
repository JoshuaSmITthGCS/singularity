import {
  DEVELOPER_SHARE_RATE,
  LANGUAGE_EXTENSION,
  PLATFORM_FEE_RATE,
  REFERRAL_RESERVE_RATE,
} from "@/lib/constants"
import { createDeliveryPullRequest } from "@/lib/github/octokit"
import { slugify } from "@/lib/utils"
import type { Asset, AssetVariant, DeliveryMethod } from "@/types/database"

export function calculateShares(priceCents: number) {
  const developerShareCents = Math.round(priceCents * DEVELOPER_SHARE_RATE)
  const platformFeeCents = Math.round(priceCents * PLATFORM_FEE_RATE)
  const referralReserveCents = Math.round(priceCents * REFERRAL_RESERVE_RATE)
  const roundingAdjustment = priceCents - developerShareCents - platformFeeCents - referralReserveCents

  return {
    developerShareCents,
    platformFeeCents: platformFeeCents + roundingAdjustment,
    referralReserveCents,
  }
}

export function buildDownloadPayload(asset: Asset, variant: AssetVariant) {
  return {
    title: asset.title,
    target_language: variant.target_language,
    translated_code: variant.translated_code ?? "",
    translated_tests: variant.translated_tests ?? "",
    notes_for_pr: variant.notes_for_pr,
  }
}

export async function deliverProcurement({
  procurementId,
  clientInstallationId,
  asset,
  variant,
  deliveryMethod,
  targetRepoFullName,
  targetRepoBranch,
}: {
  procurementId: string
  clientInstallationId: number | null
  asset: Asset
  variant: AssetVariant
  deliveryMethod: DeliveryMethod
  targetRepoFullName: string | null
  targetRepoBranch: string | null
}) {
  if (deliveryMethod === "download") {
    return {
      prUrl: null,
      prNumber: null,
    }
  }

  if (!targetRepoFullName) {
    throw new Error("Choose a target repo")
  }

  if (!clientInstallationId) {
    throw new Error("Install the GitHub App first")
  }

  const files = buildDeliveryFiles(asset, variant)

  const result = await createDeliveryPullRequest({
    installationId: clientInstallationId,
    repoFullName: targetRepoFullName,
    baseBranch: targetRepoBranch || "main",
    branchName: `singularity/${procurementId.slice(0, 8)}`,
    title: `Add ${asset.title} from Singularity`,
    body: [
      variant.notes_for_pr,
      variant.adaptation_log ? `Adaptation log:\n${variant.adaptation_log}` : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
    files,
  })

  return {
    prUrl: result.prUrl,
    prNumber: result.prNumber,
  }
}

function buildDeliveryFiles(asset: Asset, variant: AssetVariant) {
  const code = variant.translated_code ?? ""
  const tests = variant.translated_tests ?? ""

  if (variant.target_language === "java") {
    return [
      {
        path: `singularity/${javaPathFor(code, slugify(asset.title))}`,
        content: code,
      },
      {
        path: `singularity/${javaPathFor(tests, `${slugify(asset.title)}-test`)}`,
        content: tests,
      },
    ]
  }

  const extension = LANGUAGE_EXTENSION[variant.target_language]
  const baseName = slugify(asset.title)

  return [
    {
      path: `singularity/${baseName}.${extension}`,
      content: code,
    },
    {
      path: `singularity/${baseName}.test.${extension}`,
      content: tests,
    },
  ]
}

function javaPathFor(source: string, fallbackName: string) {
  const packageName = source.match(/^\s*package\s+([a-zA-Z_][\w.]*);/m)?.[1]
  const className =
    source.match(/\bpublic\s+(?:abstract\s+|final\s+|sealed\s+|non-sealed\s+)?(?:class|interface|record|enum)\s+([A-Za-z_]\w*)/)?.[1] ??
    toPascalIdentifier(fallbackName)
  const packagePath = packageName ? `${packageName.replaceAll(".", "/")}/` : ""

  return `${packagePath}${className}.java`
}

function toPascalIdentifier(value: string) {
  const identifier = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("")

  return /^[A-Za-z_]/.test(identifier) ? identifier : "Solution"
}
