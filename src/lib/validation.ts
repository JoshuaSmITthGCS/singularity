import { z } from "zod"
import {
  LONG_DESCRIPTION_MAX_LENGTH,
  PRICE_MAX_CENTS,
  PRICE_MIN_CENTS,
  SHORT_DESCRIPTION_MAX_LENGTH,
  SOURCE_CODE_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  TEST_CODE_MAX_LENGTH,
} from "@/lib/constants"

export const languageSchema = z.enum(["typescript", "javascript", "java", "csharp", "cpp"])

export const createAssetSchema = z.object({
  source_type: z.enum(["github", "paste"]),
  source_language: languageSchema,
  title: z.string().trim().min(3).max(120),
  short_description: z.string().trim().min(12).max(SHORT_DESCRIPTION_MAX_LENGTH),
  long_description: z.string().trim().max(LONG_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  summary: z.string().trim().min(40).max(SUMMARY_MAX_LENGTH),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  source_path: z.string().trim().max(500).optional().nullable(),
  test_path: z.string().trim().max(500).optional().nullable(),
  source_code: z.string().min(1).max(SOURCE_CODE_MAX_LENGTH),
  test_code: z.string().min(1).max(TEST_CODE_MAX_LENGTH),
  price_cents: z.coerce.number().int().min(PRICE_MIN_CENTS).max(PRICE_MAX_CENTS),
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
