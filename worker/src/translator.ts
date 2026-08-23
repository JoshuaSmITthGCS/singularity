import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { workerConfig } from "./config.js"
import type { Asset, Language, TranslationResult } from "./types.js"

const translationSchema = z.object({
  translated_code: z.string(),
  translated_tests: z.string(),
  adaptation_log: z.string(),
  notes_for_pr: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  dependencies: z
    .object({
      package_json: z.string().optional(),
      pom_xml: z.string().optional(),
      csproj: z.string().optional(),
      cmake: z.string().optional(),
    })
    .optional(),
  physics_context: z
    .object({
      detected_engine: z.string().optional(),
      gravity_constant: z.number().optional(),
      unit_scale: z.string().optional(),
      coordinate_system: z.string().optional(),
    })
    .optional(),
})

// Static translation-rules preamble. This is byte-identical on every call, so it
// lives in the system prompt with a cache_control breakpoint — the per-asset code
// (which varies every request) goes in the user turn after it. That makes the
// rules a cacheable prefix: we pay the write once and read it cheaply thereafter.
const TRANSLATION_RULES = [
  "You adapt game-development code faithfully between TypeScript, JavaScript, Java, C#, and C++.",
  "Preserve algorithmic behavior, edge cases, and test intent. Adapt idioms, imports, assertions, and test-runner conventions for the target language.",
  "",
  "PHYSICS ENGINE TRANSLATION RULES:",
  "- Unity (C#): Y-up coordinate system, gravity -9.81 m/s², 1 unit = 1 meter",
  "- Unreal (C++): Z-up coordinate system, gravity -980 cm/s², 1 unit = 1 cm",
  "- When translating Unity → Unreal: Convert Y→Z for vertical, multiply distances by 100 (m→cm), multiply gravity by 100",
  "- When translating Unreal → Unity: Convert Z→Y for vertical, divide by 100 (cm→m), divide gravity by 100",
  "- Preserve jump heights, velocities, and physics behavior by scaling appropriately",
  "- Detect physics context from imports (UnityEngine, CharacterController, Rigidbody vs UCharacterMovementComponent, FVector)",
  "",
  "ENVIRONMENT ADAPTATION RULES (apply when applicable, at the AST level — never via string substitution):",
  "- Unit system: convert hardcoded numeric values tied to units to the target unit system (e.g. 60.0 mph → 96.56 km/h, 150.0 lbs → 68.04 kg). Preserve relative behavior.",
  "- Naming convention: convert function/variable/class/module names to the target language's idiomatic convention (snake_case ↔ camelCase ↔ PascalCase).",
  "- Standard library substitution: map stdlib usage to idiomatic target equivalents (e.g. Python datetime.now() → JS new Date()).",
  "- Error handling paradigm: adapt to the target's idiom (Python try/except → Go explicit error returns → Rust Result<T,E>; in JS/TS use try/catch; in C# use exceptions).",
  "- Type system: add explicit type annotations or runtime checks when going dynamic→static (untyped dict → typed Record/struct) and relax appropriately static→dynamic.",
  "- Async/concurrency: map async patterns to the target's model (asyncio → async/await; threading → the target's threading/task model).",
  "- Game engine API mapping: map engine-specific calls to a documented equivalent when one exists (e.g. Unity Transform.Translate() → Godot Node3D.translate()).",
  "Record every adaptation applied (unit conversions, naming changes, engine/API mappings) in adaptation_log so it can surface in the delivery PR.",
  "",
  "If non-stdlib dependencies are needed:",
  "- JavaScript/TypeScript: include dependencies.package_json",
  "- Java: include dependencies.pom_xml",
  "- C#: include dependencies.csproj",
  "- C++: include dependencies.cmake",
  "",
  "For C#: Use Unity-style conventions (PascalCase, Rigidbody, Vector3).",
  "For C++: Use Unreal-style conventions (PascalCase classes, FVector, UCharacterMovementComponent, UCLASS/UPROPERTY macros).",
  "For Java: prefer a public class name that matches the source file convention and JUnit 5 tests.",
  "",
  "If physics code is detected, include physics_context with:",
  "- detected_engine: 'unity' | 'unreal' | 'godot' | 'custom'",
  "- gravity_constant: numeric value in source units",
  "- unit_scale: 'meters' | 'centimeters'",
  "- coordinate_system: 'y-up' | 'z-up'",
  "",
  "Keep adaptation_log and notes_for_pr concise enough to include in a pull request body.",
].join("\n")

export async function translateVariant(asset: Asset, targetLanguage: Language): Promise<TranslationResult> {
  if (targetLanguage === asset.source_language) {
    return {
      translated_code: asset.source_code,
      translated_tests: asset.test_code,
      adaptation_log: "Source-language variant reused without adaptation.",
      notes_for_pr: "This variant is the original source language.",
      confidence: "high",
    }
  }

  if (!workerConfig.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for cross-language adaptation")
  }

  const client = new Anthropic({ apiKey: workerConfig.anthropicApiKey })

  const userContent = [
    `Asset title: ${asset.title}`,
    `Source language: ${asset.source_language}`,
    `Target language: ${targetLanguage}`,
    "Adapt the source and tests into the target language as a self-contained variant, following the rules above.",
    "",
    "Source code:",
    asset.source_code,
    "",
    "Tests:",
    asset.test_code,
  ].join("\n\n")

  // Stream the response: translated code + tests can be large, and streaming
  // avoids HTTP timeouts on high max_tokens. Structured outputs constrain the
  // text block to valid JSON matching translationSchema. Adaptive thinking lets
  // Claude reason about the adaptation before emitting the result.
  const stream = client.messages.stream({
    model: workerConfig.anthropicModel,
    // 80k chars of code + 80k of tests (the publish caps in
    // src/lib/constants.ts) is ~40k output tokens before thinking. At 32000
    // a maxed-out asset always tripped the max_tokens guard below, so the
    // advertised limits were unreachable. Streaming is already in use, so the
    // larger ceiling costs nothing.
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(translationSchema),
    },
    system: [
      {
        type: "text",
        text: TRANSLATION_RULES,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude translation hit max_tokens before completing — asset too large")
  }

  const textBlock = message.content.find((block) => block.type === "text")

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude translation response contained no text output")
  }

  // output_config.format guarantees the text is JSON matching the schema; parse
  // defensively so a malformed response fails loudly rather than silently.
  return translationSchema.parse(JSON.parse(textBlock.text))
}
