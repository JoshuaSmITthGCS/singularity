import type { Asset, AssetVariant, Payment, Procurement, Profile } from "@/types/database"

const createdAt = "2026-05-20T14:00:00.000Z"
const updatedAt = "2026-05-24T18:30:00.000Z"

export const demoProfile: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  github_username: "demo-creator",
  github_user_id: 424242,
  github_installation_id: 987654,
  display_name: "Singularity Demo Creator",
  avatar_url: null,
  total_earnings_cents: 56700,
  singularity_uid: "00000000-0000-4000-9000-000000000001",
  onchain_address: null,
  whop_company_id: null,
  whop_kyc_complete: true,
  created_at: createdAt,
  updated_at: updatedAt,
}

export const demoAssets: Asset[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    developer_id: demoProfile.id,
    repo_id: null,
    source_type: "github",
    source_language: "typescript",
    title: "Deterministic Input Buffer",
    short_description: "Frame-safe input buffering for jump, dash, and interact actions.",
    long_description:
      "Designed for platformers and action games that need reliable input capture across update loops. The verified baseline covers timing windows, stale input clearing, and repeated action suppression.",
    summary:
      "A deterministic input-buffering utility for game loops. It records action presses by frame, exposes consume-once semantics, and includes tests for late jumps, double-tap suppression, and stale event expiry.",
    tags: ["gameplay", "input", "platformer", "timing"],
    source_path: "src/input-buffer.ts",
    test_path: "src/input-buffer.test.ts",
    source_code:
      "export class InputBuffer {\n  private frames = new Map<string, number>()\n\n  press(action: string, frame: number) {\n    this.frames.set(action, frame)\n  }\n\n  consume(action: string, frame: number, window = 6) {\n    const pressed = this.frames.get(action)\n    if (pressed === undefined || frame - pressed > window) return false\n    this.frames.delete(action)\n    return true\n  }\n}\n",
    test_code:
      "import { describe, expect, it } from 'vitest'\nimport { InputBuffer } from './input-buffer'\n\ndescribe('InputBuffer', () => {\n  it('consumes buffered input once', () => {\n    const buffer = new InputBuffer()\n    buffer.press('jump', 10)\n    expect(buffer.consume('jump', 14)).toBe(true)\n    expect(buffer.consume('jump', 14)).toBe(false)\n  })\n})\n",
    price_cents: 2900,
    status: "published",
    complexity: "medium",
    quality_score: 4.6,
    content_hash: null,
    blockchain_uid: null,
    view_count: 312,
    procurement_count: 14,
    whop_plan_id: null,
    whop_product_id: null,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    developer_id: demoProfile.id,
    repo_id: null,
    source_type: "paste",
    source_language: "javascript",
    title: "Cooldown Ledger",
    short_description: "Reusable cooldown tracking for abilities, tools, and scripted events.",
    long_description:
      "A compact gameplay utility for managing action cooldowns without tying the logic to a specific engine. The demo tests validate independent timers, reset behavior, and remaining-time calculations.",
    summary:
      "A cooldown ledger that tracks named timers using deterministic timestamps. It supports starting, checking readiness, resetting, and reporting remaining time for independent gameplay abilities.",
    tags: ["gameplay", "cooldown", "abilities", "utility"],
    source_path: null,
    test_path: null,
    source_code:
      "export function createCooldownLedger() {\n  const timers = new Map()\n  return {\n    start(name, now, duration) { timers.set(name, now + duration) },\n    ready(name, now) { return !timers.has(name) || now >= timers.get(name) },\n    remaining(name, now) { return Math.max(0, (timers.get(name) ?? now) - now) },\n  }\n}\n",
    test_code:
      "import { describe, expect, it } from 'vitest'\nimport { createCooldownLedger } from './solution.js'\n\ndescribe('createCooldownLedger', () => {\n  it('tracks readiness', () => {\n    const ledger = createCooldownLedger()\n    ledger.start('dash', 100, 30)\n    expect(ledger.ready('dash', 120)).toBe(false)\n    expect(ledger.ready('dash', 130)).toBe(true)\n  })\n})\n",
    price_cents: 1900,
    status: "published",
    complexity: "low",
    quality_score: 4.2,
    content_hash: null,
    blockchain_uid: null,
    view_count: 198,
    procurement_count: 8,
    whop_plan_id: null,
    whop_product_id: null,
    created_at: "2026-05-21T16:45:00.000Z",
    updated_at: updatedAt,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    developer_id: demoProfile.id,
    repo_id: null,
    source_type: "github",
    source_language: "java",
    title: "Weighted Spawn Table",
    short_description: "Seedable weighted selection for loot, enemy waves, and encounters.",
    long_description:
      "A Java baseline for deterministic weighted selection that can be adapted into TypeScript or JavaScript client projects. The tests cover edge weights and repeatable seeded output.",
    summary:
      "A weighted spawn table that selects outcomes from configured weights using deterministic random input. Useful for loot tables, encounter scripting, and procedural game content.",
    tags: ["procedural", "loot", "spawning", "random"],
    source_path: "src/main/java/SpawnTable.java",
    test_path: "src/test/java/SpawnTableTest.java",
    source_code:
      "public final class SpawnTable {\n  public static String pick(double roll) {\n    if (roll < 0.6) return \"common\";\n    if (roll < 0.9) return \"rare\";\n    return \"legendary\";\n  }\n}\n",
    test_code:
      "import static org.junit.jupiter.api.Assertions.assertEquals;\nimport org.junit.jupiter.api.Test;\n\nclass SpawnTableTest {\n  @Test void picksByWeight() {\n    assertEquals(\"common\", SpawnTable.pick(0.2));\n    assertEquals(\"rare\", SpawnTable.pick(0.7));\n    assertEquals(\"legendary\", SpawnTable.pick(0.95));\n  }\n}\n",
    price_cents: 3500,
    status: "verifying",
    complexity: "high",
    quality_score: null,
    content_hash: null,
    blockchain_uid: null,
    view_count: 74,
    procurement_count: 0,
    whop_plan_id: null,
    whop_product_id: null,
    created_at: "2026-05-25T11:15:00.000Z",
    updated_at: updatedAt,
  },
]

export const demoVariants: AssetVariant[] = [
  variant("20000000-0000-4000-8000-000000000001", demoAssets[0].id, "typescript", "passed", 31, 31, 0),
  variant("20000000-0000-4000-8000-000000000002", demoAssets[0].id, "javascript", "passed", 29, 29, 0),
  variant("20000000-0000-4000-8000-000000000003", demoAssets[0].id, "java", "testing", null, null, null),
  variant("20000000-0000-4000-8000-000000000004", demoAssets[1].id, "javascript", "passed", 18, 18, 0),
  variant("20000000-0000-4000-8000-000000000005", demoAssets[1].id, "typescript", "passed", 20, 20, 0),
  variant("20000000-0000-4000-8000-000000000006", demoAssets[1].id, "java", "failed", 20, 17, 3),
  variant("20000000-0000-4000-8000-000000000007", demoAssets[2].id, "java", "testing", null, null, null),
  variant("20000000-0000-4000-8000-000000000008", demoAssets[2].id, "typescript", "queued", null, null, null),
  variant("20000000-0000-4000-8000-000000000009", demoAssets[2].id, "javascript", "queued", null, null, null),
]

export const demoProcurements: Procurement[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    client_id: "00000000-0000-4000-8000-000000000002",
    asset_id: demoAssets[0].id,
    variant_id: demoVariants[1].id,
    developer_id: demoProfile.id,
    target_language: "javascript",
    delivery_method: "github_pr",
    target_repo_full_name: "studio/prototype-platformer",
    target_repo_branch: "main",
    price_cents: demoAssets[0].price_cents,
    developer_share_cents: 2030,
    platform_fee_cents: 725,
    referral_reserve_cents: 145,
    pr_url: "https://github.com/studio/prototype-platformer/pull/42",
    pr_number: 42,
    status: "delivered",
    failure_reason: null,
    whop_checkout_id: null,
    whop_payment_id: null,
    created_at: "2026-05-24T18:30:00.000Z",
    updated_at: updatedAt,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    client_id: "00000000-0000-4000-8000-000000000003",
    asset_id: demoAssets[1].id,
    variant_id: demoVariants[4].id,
    developer_id: demoProfile.id,
    target_language: "typescript",
    delivery_method: "download",
    target_repo_full_name: null,
    target_repo_branch: "main",
    price_cents: demoAssets[1].price_cents,
    developer_share_cents: 1330,
    platform_fee_cents: 475,
    referral_reserve_cents: 95,
    pr_url: null,
    pr_number: null,
    status: "delivered",
    failure_reason: null,
    whop_checkout_id: null,
    whop_payment_id: null,
    created_at: "2026-05-23T13:10:00.000Z",
    updated_at: updatedAt,
  },
]

export const demoPayments: Payment[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    procurement_id: demoProcurements[0].id,
    developer_id: demoProfile.id,
    amount_cents: demoProcurements[0].developer_share_cents,
    status: "paid",
    paid_at: demoProcurements[0].updated_at,
    created_at: demoProcurements[0].created_at,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    procurement_id: demoProcurements[1].id,
    developer_id: demoProfile.id,
    amount_cents: demoProcurements[1].developer_share_cents,
    status: "paid",
    paid_at: demoProcurements[1].updated_at,
    created_at: demoProcurements[1].created_at,
  },
]

export function getDemoAsset(assetId: string) {
  return demoAssets.find((asset) => asset.id === assetId) ?? null
}

export function getDemoProcurement(procurementId: string) {
  return demoProcurements.find((procurement) => procurement.id === procurementId) ?? null
}

export function getDemoVariant(variantId: string) {
  return demoVariants.find((variant) => variant.id === variantId) ?? null
}

function variant(
  id: string,
  assetId: string,
  targetLanguage: AssetVariant["target_language"],
  status: AssetVariant["status"],
  testsTotal: number | null,
  testsPassed: number | null,
  testsFailed: number | null
): AssetVariant {
  return {
    id,
    asset_id: assetId,
    target_language: targetLanguage,
    translated_code: demoCode(targetLanguage),
    translated_tests: demoTests(targetLanguage),
    adaptation_log: "Demo adaptation preserves source behavior and maps test assertions to the target runner.",
    notes_for_pr: "Demo delivery: add the adapted asset and tests under the singularity/ directory.",
    confidence: status === "failed" ? "medium" : "high",
    tests_total: testsTotal,
    tests_passed: testsPassed,
    tests_failed: testsFailed,
    test_output: status === "failed" ? "Demo target failed 3 behavioral assertions." : "Demo target checks passed.",
    status,
    worker_claimed_by: status === "queued" ? null : "worker-demo-1",
    worker_claimed_at: status === "queued" ? null : updatedAt,
    started_at: status === "queued" ? null : updatedAt,
    completed_at: status === "passed" || status === "failed" ? updatedAt : null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function demoCode(language: AssetVariant["target_language"]) {
  if (language === "java") {
    return "public final class SingularityDemoAsset {\n  public boolean ready(int frame) {\n    return frame >= 6;\n  }\n}\n"
  }

  if (language === "typescript") {
    return "export function ready(frame: number): boolean {\n  return frame >= 6\n}\n"
  }

  return "export function ready(frame) {\n  return frame >= 6\n}\n"
}

function demoTests(language: AssetVariant["target_language"]) {
  if (language === "java") {
    return "import static org.junit.jupiter.api.Assertions.assertTrue;\nimport org.junit.jupiter.api.Test;\n\nclass SingularityDemoAssetTest {\n  @Test void verifiesReadyWindow() {\n    assertTrue(new SingularityDemoAsset().ready(6));\n  }\n}\n"
  }

  return "import { describe, expect, it } from 'vitest'\nimport { ready } from './solution'\n\ndescribe('ready', () => {\n  it('verifies the ready window', () => {\n    expect(ready(6)).toBe(true)\n  })\n})\n"
}
