export type Language = "javascript" | "typescript" | "java" | "csharp" | "cpp"
export type VariantStatus = "queued" | "translating" | "testing" | "passed" | "failed"
export type Confidence = "high" | "medium" | "low"

export type Asset = {
  id: string
  developer_id: string
  source_language: Language
  title: string
  source_code: string
  test_code: string
  status: string
  complexity: "low" | "medium" | "high" | null
}

export type AssetVariant = {
  id: string
  asset_id: string
  target_language: Language
  status: VariantStatus
  translated_code: string | null
  translated_tests: string | null
}

export type TranslationDependencies = {
  package_json?: string
  pom_xml?: string
  csproj?: string
  cmake?: string
}

export type TranslationUsage = {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export type TranslationResult = {
  translated_code: string
  translated_tests: string
  adaptation_log: string
  notes_for_pr: string
  confidence: Confidence
  dependencies?: TranslationDependencies
  // Absent for source-language reuse (no LLM call).
  usage?: TranslationUsage
}

export type TestResult = {
  status: "passed" | "failed"
  testsTotal: number | null
  testsPassed: number | null
  testsFailed: number | null
  output: string
}
