// §4.5 / §13 LLM auto-tagging phase: generates `llm_v1` structured tags from
// the asset's source code, title, and descriptions. Called after the source-
// language variant passes verification and the asset is flipped to `published`.
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { workerConfig } from "./config.js"
import type { Asset } from "./types.js"

const GENRES = [
  "game", "simulation", "web", "data-pipeline", "systems",
  "graphics", "networking", "ai-ml", "tooling",
] as const

const PURPOSES = [
  "authentication", "pathfinding", "image-processing", "physics",
  "collision-detection", "rendering", "serialization", "validation",
  "state-management", "math", "io",
] as const

const ACTIONS = [
  "validate", "transform", "calculate", "render", "parse",
  "generate", "optimize", "simulate", "encode", "decode",
] as const

const ENGINES = ["unity", "unreal", "godot", "generic", "react-native"] as const

const COMPLEXITY = ["low", "medium", "high"] as const

const llmTagSchema = z.object({
  genre: z.array(z.enum(GENRES)).max(8),
  purpose: z.array(z.enum(PURPOSES)).max(12),
  actions: z.array(z.enum(ACTIONS)).max(12),
  compatible_engines: z.array(z.enum(ENGINES)).max(8),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20),
  complexity: z.enum(COMPLEXITY),
  // 0.0–1.0: how confident the model is given available context.
  confidence_score: z.number().min(0).max(1),
})

export type LlmTagResult = z.infer<typeof llmTagSchema>

const TAGGING_RULES = `You classify game-development code assets using a controlled vocabulary. Analyse the title, descriptions, and source code, then emit JSON matching the schema.

GENRE (1–3 values): game | simulation | web | data-pipeline | systems | graphics | networking | ai-ml | tooling
PURPOSE (1–4 values): authentication | pathfinding | image-processing | physics | collision-detection | rendering | serialization | validation | state-management | math | io
ACTIONS (1–4 values): validate | transform | calculate | render | parse | generate | optimize | simulate | encode | decode
COMPATIBLE_ENGINES (only what the code explicitly targets): unity | unreal | godot | generic | react-native
KEYWORDS: ≤10 short freeform tags for domain concepts not covered by the controlled vocabulary above
COMPLEXITY: low | medium | high — assess from the code itself; ignore any developer-declared value
CONFIDENCE_SCORE: 0.0–1.0 reflecting how certain you are given the available context`

export async function generateLlmTags(asset: Asset): Promise<LlmTagResult> {
  if (!workerConfig.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for LLM tagging")
  }

  const client = new Anthropic({ apiKey: workerConfig.anthropicApiKey })

  const lines: string[] = [
    `Title: ${asset.title}`,
    asset.short_description ? `Short description: ${asset.short_description}` : "",
    asset.summary ? `Summary: ${asset.summary}` : "",
    `Source language: ${asset.source_language}`,
    "",
    "Source code:",
    asset.source_code,
    "",
    "Tests:",
    asset.test_code,
  ]

  const userContent = lines.filter(Boolean).join("\n\n")

  const message = await client.messages.create({
    model: workerConfig.anthropicModel,
    max_tokens: 2048,
    output_config: {
      format: zodOutputFormat(llmTagSchema),
    },
    system: TAGGING_RULES,
    messages: [{ role: "user", content: userContent }],
  })

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude tagging hit max_tokens — asset too large to tag")
  }

  const textBlock = message.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude tagging response contained no text output")
  }

  return llmTagSchema.parse(JSON.parse(textBlock.text))
}
