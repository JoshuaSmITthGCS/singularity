export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Language = "javascript" | "typescript" | "java" | "csharp" | "cpp"
export type AssetStatus = "draft" | "verifying" | "published" | "archived" | "flagged"
export type VariantStatus = "queued" | "translating" | "testing" | "passed" | "failed"
export type DeliveryMethod = "github_pr" | "download"
export type ProcurementStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "delivering"
  | "delivered"
  | "failed"
export type Confidence = "high" | "medium" | "low"
export type Complexity = "low" | "medium" | "high"

export type Profile = {
  id: string
  github_username: string | null
  github_user_id: number | null
  github_installation_id: number | null
  display_name: string | null
  avatar_url: string | null
  total_earnings_cents: number
  singularity_uid: string
  onchain_address: string | null
  whop_company_id: string | null
  whop_kyc_complete: boolean
  created_at: string
  updated_at: string
}

export type Repo = {
  id: string
  owner_id: string
  github_repo_id: number
  github_full_name: string
  default_branch: string
  connected_at: string
}

export type Asset = {
  id: string
  developer_id: string
  repo_id: string | null
  source_type: "github" | "paste"
  source_language: Language
  title: string
  short_description: string
  long_description: string | null
  summary: string
  tags: string[]
  source_path: string | null
  test_path: string | null
  source_code: string
  test_code: string
  price_cents: number
  status: AssetStatus
  complexity: Complexity | null
  quality_score: number | null
  content_hash: string | null
  blockchain_uid: string | null
  whop_plan_id: string | null
  whop_product_id: string | null
  view_count: number
  procurement_count: number
  created_at: string
  updated_at: string
}

// §4.5 versioned structured tags.
export type AssetTag = {
  id: string
  asset_id: string
  version: number
  source: "llm_v1" | "developer" | "admin"
  genre: string[]
  purpose: string[]
  actions: string[]
  keywords: string[]
  compatible_engines: string[]
  complexity: Complexity | null
  short_description: string | null
  long_description: string | null
  confidence_score: number | null
  created_at: string
}

// §5.1 client native environment config.
export type ClientEnvConfig = {
  id: string
  user_id: string
  primary_language: Language
  secondary_languages: Language[]
  target_engine: string | null
  unit_system: "metric" | "imperial"
  naming_convention: "snake_case" | "camelCase" | "PascalCase" | null
  repo_target: string | null
  target_branch: string
  pr_mode: boolean
  created_at: string
  updated_at: string
}

export type AssetVariant = {
  id: string
  asset_id: string
  target_language: Language
  translated_code: string | null
  translated_tests: string | null
  adaptation_log: string | null
  notes_for_pr: string | null
  confidence: Confidence | null
  tests_total: number | null
  tests_passed: number | null
  tests_failed: number | null
  test_output: string | null
  status: VariantStatus
  // Cost tracking (worker-written): model + token spend behind this variant.
  model: string | null
  tokens_input: number | null
  tokens_output: number | null
  translation_cost_cents: number | null
  worker_claimed_by: string | null
  worker_claimed_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type Procurement = {
  id: string
  client_id: string
  asset_id: string
  variant_id: string
  developer_id: string
  target_language: Language
  delivery_method: DeliveryMethod
  target_repo_full_name: string | null
  target_repo_branch: string | null
  price_cents: number
  developer_share_cents: number
  platform_fee_cents: number
  referral_reserve_cents: number
  pr_url: string | null
  pr_number: number | null
  status: ProcurementStatus
  failure_reason: string | null
  whop_checkout_id: string | null
  whop_payment_id: string | null
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  procurement_id: string
  developer_id: string
  amount_cents: number
  status: "pending" | "paid" | "failed"
  paid_at: string | null
  created_at: string
}

export type MarketplaceAsset = Pick<
  Asset,
  | "id"
  | "developer_id"
  | "source_language"
  | "title"
  | "short_description"
  | "long_description"
  | "summary"
  | "tags"
  | "price_cents"
  | "view_count"
  | "procurement_count"
  | "created_at"
>

// §5.2 marketplace_search view — published assets joined to their latest tag
// version. Code/tests omitted; structured filter fields exposed.
export type MarketplaceSearchRow = {
  id: string
  developer_id: string
  primary_language: Language
  title: string
  short_description: string
  summary: string
  price_cents: number
  quality_score: number | null
  complexity: Complexity | null
  view_count: number
  procurement_count: number
  created_at: string
  genre: string[] | null
  purpose: string[] | null
  actions: string[] | null
  keywords: string[] | null
  compatible_engines: string[] | null
}
export type MarketplaceVariant = Pick<
  AssetVariant,
  | "id"
  | "asset_id"
  | "target_language"
  | "status"
  | "confidence"
  | "tests_total"
  | "tests_passed"
  | "tests_failed"
>

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>
      repos: Table<Repo, Omit<Repo, "id" | "connected_at"> & { id?: string; connected_at?: string }>
      assets: Table<
        Asset,
        Omit<
          Asset,
          | "id"
          | "created_at"
          | "updated_at"
          | "view_count"
          | "procurement_count"
          | "whop_plan_id"
          | "whop_product_id"
          | "complexity"
          | "quality_score"
          | "content_hash"
          | "blockchain_uid"
        > &
          Partial<
            Pick<
              Asset,
              | "id"
              | "created_at"
              | "updated_at"
              | "view_count"
              | "procurement_count"
              | "whop_plan_id"
              | "whop_product_id"
              | "complexity"
              | "quality_score"
              | "content_hash"
              | "blockchain_uid"
            >
          >
      >
      asset_tags: Table<
        AssetTag,
        Omit<AssetTag, "id" | "created_at"> & Partial<Pick<AssetTag, "id" | "created_at">>
      >
      client_env_configs: Table<
        ClientEnvConfig,
        Omit<ClientEnvConfig, "id" | "created_at" | "updated_at"> &
          Partial<Pick<ClientEnvConfig, "id" | "created_at" | "updated_at">>
      >
      asset_variants: Table<
        AssetVariant,
        Pick<AssetVariant, "asset_id" | "target_language" | "status"> & Partial<AssetVariant>
      >
      procurements: Table<
        Procurement,
        Omit<
          Procurement,
          | "id"
          | "created_at"
          | "updated_at"
          | "pr_url"
          | "pr_number"
          | "failure_reason"
          | "whop_checkout_id"
          | "whop_payment_id"
        > &
          Partial<
            Pick<
              Procurement,
              | "id"
              | "created_at"
              | "updated_at"
              | "pr_url"
              | "pr_number"
              | "failure_reason"
              | "whop_checkout_id"
              | "whop_payment_id"
            >
          >
      >
      payments: Table<
        Payment,
        Omit<Payment, "id" | "created_at"> & Partial<Pick<Payment, "id" | "created_at">>
      >
    }
    Views: {
      marketplace_assets: {
        Row: MarketplaceAsset
        Insert: never
        Update: never
        Relationships: []
      }
      marketplace_variants: {
        Row: MarketplaceVariant
        Insert: never
        Update: never
        Relationships: []
      }
      marketplace_search: {
        Row: MarketplaceSearchRow
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Functions: {
      claim_next_variant: {
        Args: {
          p_worker_id: string
          p_timeout_minutes?: number
        }
        Returns: AssetVariant[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
