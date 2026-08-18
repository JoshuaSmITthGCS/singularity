import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { workerConfig } from "./config.js"
import { ACTIONS, ENGINES, GENRES, PURPOSES } from "./taxonomy.js"
import { supabase } from "./db.js"
import type { Asset } from "./types.js"

// Phase 1 (deferred TRD work, now implemented): the LLM auto-tagging pass.
// Runs once, right after an asset's source-language variant first passes and
// the asset flips to `published`. Produces a versioned `llm_v1` asset_tags
// row that fills in whatever structured fields the developer left empty —
// it never overwrites a developer-provided value.

const tagResultSchema = z.object({
  genre: z.array(z.enum(GENRES)).max(8),
  purpose: z.array(z.enum(PURPOSES)).max(12),
  actions: z.array(z.enum(ACTIONS)).max(12),
  compatible_engines: z.array(z.enum(ENGINES)).max(8),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20),
  confidence: z.number().min(0).max(1),
})

type TagRow = {
  version: number
  source: string
  genre: string[]
  purpose: string[]
  actions: string[]
  keywords: string[]
  compatible_engines: string[]
}

const TAGGER_RULES = [
  "You classify game-development source code into a controlled vocabulary for a code marketplace's search index.",
  "Pick only values from the provided enums — never invent new ones. Leave an array empty if nothing clearly applies.",
  "keywords are freeform (lowercase, short, no punctuation) and may include terms outside the controlled vocabulary.",
  "confidence is your overall confidence (0-1) in this classification given the code and description.",
].join("\n")

export async function generateAutoTags(asset: Asset): Promise<z.infer<typeof tagResultSchema> | null> {
  if (!workerConfig.anthropicApiKey) return null

  const client = new Anthropic({ apiKey: workerConfig.anthropicApiKey })

  const userContent = [
    `Title: ${asset.title}`,
    `Source language: ${asset.source_language}`,
    "Classify this asset.",
    "",
    "Source code:",
    asset.source_code,
    "",
    "Tests:",
    asset.test_code,
  ].join("\n\n")

  const message = await client.messages.create({
    model: workerConfig.anthropicModel,
    max_tokens: 4000,
    output_config: {
      effort: "low",
      format: zodOutputFormat(tagResultSchema),
    },
    system: [{ type: "text", text: TAGGER_RULES, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
  })

  const textBlock = message.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") return null

  return tagResultSchema.parse(JSON.parse(textBlock.text))
}

// Insert a new `llm_v1` asset_tags version. Developer-provided fields (from
// the highest existing version) win; the LLM only fills fields the developer
// left empty. Never overwrites the developer's row.
export async function persistAutoTags(assetId: string, generated: z.infer<typeof tagResultSchema>) {
  const { data: existing, error } = await supabase
    .from("asset_tags")
    .select("version, source, genre, purpose, actions, keywords, compatible_engines")
    .eq("asset_id", assetId)
    .order("version", { ascending: false })
    .limit(1)

  if (error) throw error

  const latest = (existing?.[0] ?? null) as TagRow | null
  const nextVersion = (latest?.version ?? 0) + 1

  const merged = {
    genre: fillIfEmpty(latest?.genre, generated.genre),
    purpose: fillIfEmpty(latest?.purpose, generated.purpose),
    actions: fillIfEmpty(latest?.actions, generated.actions),
    compatible_engines: fillIfEmpty(latest?.compatible_engines, generated.compatible_engines),
    keywords: fillIfEmpty(latest?.keywords, generated.keywords),
  }

  await supabase
    .from("asset_tags")
    .insert({
      asset_id: assetId,
      version: nextVersion,
      source: "llm_v1",
      confidence_score: generated.confidence,
      ...merged,
    })
    .throwOnError()
}

function fillIfEmpty(developerValue: string[] | undefined, llmValue: string[]) {
  return developerValue && developerValue.length > 0 ? developerValue : llmValue
}
