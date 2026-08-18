import { workerConfig } from "./config.js"
import { claimNextVariant } from "./claim.js"
import { supabase } from "./db.js"
import { runTests } from "./test-runner.js"
import { translateVariant } from "./translator.js"
import { generateAutoTags, persistAutoTags } from "./tagger.js"
import { computeAssetPriceCents, computeQualityScore, type Complexity } from "./pricing.js"
import type { Asset } from "./types.js"

async function main() {
  console.log(`Singularity worker ${workerConfig.workerId} started`)

  for (;;) {
    const claimed = await claimNextVariant(workerConfig.workerId, workerConfig.claimTimeoutMinutes)

    if (!claimed) {
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

  if (targetLanguage === asset.source_language && testResult.status === "passed" && asset.status === "verifying") {
    // §7.4: derive a quality score from verification results and reprice the
    // asset via the unit-economics formula (complexity tier + quality bonus).
    const qualityScore = computeQualityScore(testResult)
    const priceCents = computeAssetPriceCents({
      complexity: (asset.complexity as Complexity) ?? "medium",
      qualityScore,
    })

    await supabase
      .from("assets")
      .update({ status: "published", quality_score: qualityScore, price_cents: priceCents })
      .eq("id", asset.id)
      .throwOnError()

    // Phase 1 auto-tagging: best-effort — a tagging failure must never block
    // publishing, so log and move on rather than throwing.
    await generateAutoTags(asset)
      .then((tags) => (tags ? persistAutoTags(asset.id, tags) : undefined))
      .catch((error) => console.error(`Auto-tagging failed for ${asset.id}:`, error))
  }

  console.log(`Processed ${variantId}: ${testResult.status}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
