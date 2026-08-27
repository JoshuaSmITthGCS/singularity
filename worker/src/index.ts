import { workerConfig } from "./config.js"
import { claimNextVariant } from "./claim.js"
import { supabase } from "./db.js"
import { runTests } from "./test-runner.js"
import { translateVariant } from "./translator.js"
import { generateAutoTags, persistAutoTags } from "./tagger.js"
import { computeAssetPriceCents, computeQualityScore, type Complexity } from "./pricing.js"
import type { Asset } from "./types.js"

async function main() {
  console.log(
    `Singularity worker ${workerConfig.workerId} started (concurrency=${workerConfig.concurrency})`
  )

  // Each slot runs its own independent claim loop. claim_next_variant's
  // FOR UPDATE SKIP LOCKED already makes concurrent claiming safe (it's the
  // same mechanism that lets multiple separate worker hosts share the queue),
  // so N slots in one process is just that same safety used to run a single
  // asset's non-source-language variants side by side instead of one at a
  // time -- the same demo publish that took ~4x one variant's translate+test
  // time now takes ~1x, plus whatever the queue depth beyond `concurrency`
  // adds.
  await Promise.all(
    Array.from({ length: workerConfig.concurrency }, (_, slot) => workerLoop(`${workerConfig.workerId}-${slot}`))
  )

  if (workerConfig.exitWhenIdle) {
    console.log("Queue drained, exiting (WORKER_EXIT_WHEN_IDLE=true)")
  }
}

async function workerLoop(slotWorkerId: string) {
  for (;;) {
    const claimed = await claimNextVariant(slotWorkerId, workerConfig.claimTimeoutMinutes)

    if (!claimed) {
      if (workerConfig.exitWhenIdle) {
        return
      }
      await sleep(workerConfig.pollIntervalMs)
      continue
    }

    await processVariant(claimed.id, claimed.asset_id, claimed.target_language).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Worker job failed"
      console.error(message)
      await supabase
        .from("asset_variants")
        .update({
          status: "failed",
          test_output: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
    })
  }
}

async function processVariant(variantId: string, assetId: string, targetLanguage: Asset["source_language"]) {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .single()

  if (assetError || !asset) {
    throw new Error(assetError?.message ?? "Asset not found")
  }

  const translation = await translateVariant(asset as Asset, targetLanguage)

  await supabase
    .from("asset_variants")
    .update({
      translated_code: translation.translated_code,
      translated_tests: translation.translated_tests,
      adaptation_log: translation.adaptation_log,
      notes_for_pr: translation.notes_for_pr,
      confidence: translation.confidence,
      status: "testing",
    })
    .eq("id", variantId)
    .throwOnError()

  const testResult = await runTests({
    language: targetLanguage,
    code: translation.translated_code,
    tests: translation.translated_tests,
    dependencies: translation.dependencies,
  })

  await supabase
    .from("asset_variants")
    .update({
      status: testResult.status,
      tests_total: testResult.testsTotal,
      tests_passed: testResult.testsPassed,
      tests_failed: testResult.testsFailed,
      test_output: testResult.output.slice(0, 20000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", variantId)
    .throwOnError()

  await scoreAndPriceAsset(asset)

  console.log(`Processed ${variantId}: ${testResult.status}`)
}

// §7.4: re-derive the quality score and price after every variant, not only the
// source one. Cross-language portability is part of the score and only becomes
// known as siblings finish, so an asset that translates cleanly into four other
// languages earns its way up as the evidence arrives.
async function scoreAndPriceAsset(asset: Asset) {
  const { data: variants } = await supabase
    .from("asset_variants")
    .select("target_language, status, tests_total")
    .eq("asset_id", asset.id)

  if (!variants?.length) return

  const source = variants.find((variant) => variant.target_language === asset.source_language)

  // Nothing is priced or published until the asset proves itself in its own
  // language. A failing source variant means there is no verified asset here.
  if (source?.status !== "passed") return

  const qualityScore = computeQualityScore({
    sourceTestsTotal: source.tests_total,
    variantsPassed: variants.filter((variant) => variant.status === "passed").length,
    variantsTotal: variants.length,
  })

  // Score and price always; they stay accurate even for an asset an admin has
  // since archived or flagged.
  await supabase
    .from("assets")
    .update({
      quality_score: qualityScore,
      price_cents: computeAssetPriceCents({
        complexity: (asset.complexity as Complexity) ?? "medium",
        qualityScore,
      }),
    })
    .eq("id", asset.id)
    .throwOnError()

  // Publishing is a one-way transition out of `verifying`. Scoping the update
  // to that status keeps it idempotent across sibling variants and stops a
  // re-score from resurrecting an archived or flagged asset.
  await supabase
    .from("assets")
    .update({ status: "published" })
    .eq("id", asset.id)
    .eq("status", "verifying")
    .throwOnError()

  // Phase 1 auto-tagging runs once, on that transition. `asset` was read when
  // this job claimed the variant, so its status is the pre-transition one.
  // Best-effort: a tagging failure must never block publishing.
  if (asset.status === "verifying") {
    await generateAutoTags(asset)
      .then((tags) => (tags ? persistAutoTags(asset.id, tags) : undefined))
      .catch((error) => console.error(`Auto-tagging failed for ${asset.id}:`, error))
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
