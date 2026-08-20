import { workerConfig } from "./config.js"
import { claimNextVariant } from "./claim.js"
import { sumUsage } from "./cost.js"
import { supabase } from "./db.js"
import { runTests } from "./test-runner.js"
import { translateVariant } from "./translator.js"
import { computeAssetPriceCents, computeQualityScore, type Complexity } from "./pricing.js"
import type { Asset, TranslationResult, TranslationUsage } from "./types.js"

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

  const usageEntries: TranslationUsage[] = []

  const translateAndTest = async (model?: string) => {
    const translation = await translateVariant(asset as Asset, targetLanguage, model)
    if (translation.usage) usageEntries.push(translation.usage)

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

    return { translation, testResult }
  }

  // Cost ladder: cheap model first; on a failed cross-language translation,
  // one retry with the escalation model before giving up. Source-language
  // variants never involve an LLM, so a failure there is the asset's own
  // tests failing — escalation can't fix that.
  let { translation, testResult } = await translateAndTest()

  const canEscalate =
    targetLanguage !== asset.source_language &&
    workerConfig.anthropicEscalationModel !== workerConfig.anthropicModel

  if (testResult.status === "failed" && canEscalate) {
    console.log(`Escalating ${variantId} to ${workerConfig.anthropicEscalationModel}`)
    const retry = await translateAndTest(workerConfig.anthropicEscalationModel)
    translation = withEscalationNote(retry.translation)
    testResult = retry.testResult

    await supabase
      .from("asset_variants")
      .update({ adaptation_log: translation.adaptation_log })
      .eq("id", variantId)
      .throwOnError()
  }

  const usage = sumUsage(usageEntries)

  await supabase
    .from("asset_variants")
    .update({
      status: testResult.status,
      tests_total: testResult.testsTotal,
      tests_passed: testResult.testsPassed,
      tests_failed: testResult.testsFailed,
      test_output: testResult.output.slice(0, 20000),
      model: usage.model,
      tokens_input: usage.tokensInput,
      tokens_output: usage.tokensOutput,
      translation_cost_cents: usage.costCents,
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
  }

  console.log(`Processed ${variantId}: ${testResult.status}`)
}

// Surface the escalation in the adaptation log so buyers (and the PR body)
// see which model produced the verified translation.
function withEscalationNote(translation: TranslationResult): TranslationResult {
  return {
    ...translation,
    adaptation_log: `${translation.adaptation_log}\n\nFirst-pass translation failed verification; re-translated with ${workerConfig.anthropicEscalationModel}.`,
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
