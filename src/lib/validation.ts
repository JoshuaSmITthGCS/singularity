import { z } from "zod"
import {
  LONG_DESCRIPTION_MAX_LENGTH,
  SHORT_DESCRIPTION_MAX_LENGTH,
  SOURCE_CODE_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  TEST_CODE_MAX_LENGTH,
} from "@/lib/constants"
import { ACTIONS, COMPLEXITY_LEVELS, ENGINES, GENRES, PURPOSES } from "@/lib/taxonomy"

export const languageSchema = z.enum(["typescript", "javascript", "java", "csharp", "cpp"])

// §4.5 TagSchema. Structured, controlled-vocabulary tags; keywords are freeform.
export const tagSchema = z.object({
  genre: z.array(z.enum(GENRES)).max(8).default([]),
  purpose: z.array(z.enum(PURPOSES)).max(12).default([]),
  actions: z.array(z.enum(ACTIONS)).max(12).default([]),
  compatible_engines: z.array(z.enum(ENGINES)).max(8).default([]),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
})

export const createAssetSchema = z.object({
  source_type: z.enum(["github", "paste"]),
  source_language: languageSchema,
  title: z.string().trim().min(3).max(120),
  short_description: z.string().trim().min(12).max(SHORT_DESCRIPTION_MAX_LENGTH),
  long_description: z.string().trim().max(LONG_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  summary: z.string().trim().min(40).max(SUMMARY_MAX_LENGTH),
  // §4.5 structured tags (developer-provided override; LLM enriches in the worker).
  tags: tagSchema.partial().optional(),
  // §7.4 price is computed from the unit-economics formula, not user input.
  // Developers declare complexity; quality_score comes from analysis.
  complexity: z.enum(COMPLEXITY_LEVELS).default("medium"),
  source_path: z.string().trim().max(500).optional().nullable(),
  test_path: z.string().trim().max(500).optional().nullable(),
  source_code: z.string().min(1).max(SOURCE_CODE_MAX_LENGTH),
  test_code: z.string().min(1).max(TEST_CODE_MAX_LENGTH),
})

// §5.1 client native environment config — the ITE instruction set.
export const clientEnvConfigSchema = z.object({
  primary_language: languageSchema,
  secondary_languages: z.array(languageSchema).max(4).default([]),
  target_engine: z.enum(ENGINES).optional().nullable(),
  unit_system: z.enum(["metric", "imperial"]).default("metric"),
  naming_convention: z.enum(["snake_case", "camelCase", "PascalCase"]).optional().nullable(),
  repo_target: z.string().trim().max(300).optional().nullable(),
  target_branch: z.string().trim().max(200).default("main"),
  pr_mode: z.boolean().default(true),
})

// §5.2.1 structured filter + §5.2.2 free-text search params.
export const searchQuerySchema = z.object({
  q: z.string().trim().max(300).optional(),
  genre: z.array(z.enum(GENRES)).optional(),
  purpose: z.array(z.enum(PURPOSES)).optional(),
  actions: z.array(z.enum(ACTIONS)).optional(),
  engine: z.array(z.enum(ENGINES)).optional(),
  complexity: z.enum(COMPLEXITY_LEVELS).optional(),
  lang: z.array(languageSchema).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export const createProcurementSchema = z.object({
  asset_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  delivery_method: z.enum(["github_pr", "download"]),
  target_repo_full_name: z.string().trim().max(300).optional().nullable(),
  target_repo_branch: z.string().trim().max(200).optional().nullable(),
})

export const githubFilesQuerySchema = z.object({
  repo: z.string().min(1).max(300),
  path: z.string().max(1000).default(""),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>
export type CreateProcurementInput = z.infer<typeof createProcurementSchema>
export type ClientEnvConfigInput = z.infer<typeof clientEnvConfigSchema>
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
export type TagInput = z.infer<typeof tagSchema>
