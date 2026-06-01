# Singularity — Development Roadmap

A prioritized, step-by-step plan for the work remaining after the MVP +
TRD-alignment pass. Phases are ordered by **value/risk**: each one is shippable
on its own and leaves the app in a working state. Infra-heavy items are last,
on purpose — build them when volume actually demands them, not before.

Legend: 🟢 quick win · 🟡 feature · 🔴 large/infra

---

## Phase 0 — Stabilize & guardrail 🟢

Goal: a green baseline so every later change is safe to ship.

1. **Fix the pre-existing `LanguageBadge` type bug.**
   - Files: `src/components/LanguageBadge.tsx`, callers in `AssetCard.tsx`,
     `dashboard/page.tsx`, `marketplace/[assetId]/page.tsx`.
   - Make the `status` prop accept `VariantStatus | null | undefined` (or
     normalize `undefined → null` at the call sites). Clears the 3 `tsc` errors.
   - ✅ Done when `pnpm exec tsc --noEmit` is clean (excluding missing-dep noise)
     once deps are installed.

2. **Add a test framework (Vitest).**
   - `pnpm add -D vitest`; add `"test": "vitest run"` to `package.json`.
   - First unit tests (pure logic, no services):
     - `src/lib/pricing.ts` — formula + revenue split rounding.
     - `src/lib/validation.ts` — `createAssetSchema`, `tagSchema`, `searchQuerySchema`.
     - `src/lib/marketplace/search.ts` — demo-mode filter + expanded fallback.
   - ✅ Done when `pnpm test` passes and runs in CI.

3. **CI check (GitHub Actions).**
   - Workflow: `pnpm install`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`.
   - Runs in demo mode (no secrets needed).
   - ✅ Done when the workflow is green on a PR.

---

## Phase 1 — Close the TagSchema loop (LLM auto-tagging) 🟡

Goal: deliver the deferred `llm_v1` tagging phase so search has rich, structured
tags even when developers under-tag.

1. **Add a tagging call in the worker** (`worker/src/translator.ts` or a new
   `worker/src/tagger.ts`).
   - After the source variant passes, send the source + summary to the LLM with
     a Zod schema matching `tagSchema` (genre/purpose/actions/compatible_engines/
     keywords + per-field confidence).
   - Use the controlled vocabulary from `src/lib/taxonomy.ts` (mirror it into the
     worker, like `pricing.ts` is mirrored).

2. **Persist as a new tag version** in `worker/src/index.ts`.
   - Insert an `asset_tags` row with `version = max(version)+1`, `source='llm_v1'`,
     `confidence_score` set. Never overwrite the developer's v1 record.

3. **Merge logic for search/display.**
   - The `marketplace_search` view already takes the latest version. Decide the
     precedence rule: developer-provided fields win; LLM fills gaps. Implement in
     the tagger (read v1, only emit fields the developer left empty) or in a
     `latest effective tags` view.

   ✅ Done when publishing an asset yields both a `developer` and an `llm_v1`
   tag row, and the new tags appear in `/api/search` filters.

---

## Phase 2 — Wire structured search to the marketplace UI 🟡

Goal: actually use the `/api/search` endpoint that exists but isn't connected.

1. **Add filter controls to `MarketplaceSearch.tsx`.**
   - Genre/purpose/engine/complexity/language facets, using `GENRE_GROUPS` from
     `taxonomy.ts` for the grouped genre control. Make it a client component that
     holds filter state.

2. **Call the endpoint.**
   - On filter/search change, `GET /api/search?...` (array params repeat). Render
     `results`, then the `expanded` set under the `expanded_label` banner.
   - Keep the current `getMarketplaceAssets()` listing as the default/empty-query
     view so the page still works with no filters.

3. **Reflect filters in the URL** (`useSearchParams`) for shareable searches.

   ✅ Done when selecting a genre/engine filters the grid via the API and the
   "Related assets you may not have considered" fallback shows when matches are
   thin.

---

## Phase 3 — Client-config-driven delivery (per-buyer ITE) 🟡🔴

Goal: honor the TRD's intent that delivery is adapted to the **buyer's**
environment (`client_env_configs`), not just pre-translated per language.

Today: translation is precomputed per language at publish. The buyer's
`target_engine` / `unit_system` / `naming_convention` are stored but not yet
applied at purchase.

1. **Add a settings page** (`/dashboard/settings` or `/settings`) backed by the
   existing `GET/PUT /api/client/env-config`. Let buyers set their environment.

2. **Apply config at procurement** (`src/lib/procurements`).
   - When delivering, if the buyer's config implies adaptation beyond the stored
     variant (specific engine/unit/naming), run a targeted re-adaptation pass
     (LLM) on the already-verified variant, then re-run tests in the sandbox
     before delivering. Only deliver if it still passes.
   - If no extra adaptation is needed, deliver the stored variant as-is.

3. **Surface the applied adaptations** in the PR body / download notes.

   ✅ Done when two buyers with different engine configs receive
   appropriately-adapted, still-verified deliveries of the same asset.

> Note: this is the largest behavioral change. Consider a feature flag and start
> with naming/unit adaptation (cheap, deterministic-ish) before engine-API remaps.

---

## Phase 4 — Trust & growth features 🟡

1. **Ratings & reviews** — table + RLS (only buyers who completed a procurement
   can review), aggregate score on the asset card, factor into search ranking.
2. **Developer analytics** — views/conversions/earnings over time on the
   dashboard.
3. **Referral system** — spend the 5% referral reserve that's already split out
   (`REFERRAL_RESERVE_RATE`): referral codes, attribution, payout.

---

## Phase 5 — Scale infrastructure (deferred until volume demands) 🔴

Only build these when metrics justify them; each adds real operational cost.

1. **Search at scale** — ElasticSearch index + semantic re-ranking
   (LLM intent parse → vector recall → cross-encoder rerank). Replaces the
   Postgres array-overlap search in `lib/marketplace/search.ts`.
2. **Sandbox hardening** — gVisor (`runsc`) runtime for `test-runner.ts`;
   per-language CPU/mem/time budgets; egress controls.
3. **On-chain provenance/settlement** — the schema already anchors
   `singularity_uid`, `content_hash`, `onchain_address`, `blockchain_uid`.
   Add contracts + a settlement path; keep Whop as the fiat on-ramp.
4. **Service split** — extract the worker fleet and (eventually) search into
   separately-scaled services; Kubernetes if/when justified.

---

## Optional track — translation provider

Translation currently uses OpenAI (`worker/src/translator.ts`, `OPENAI_MODEL`).
If you want to evaluate **Claude** for translation/tagging quality, do it behind
a provider interface so it's a config switch, not a rewrite:

- Introduce `worker/src/llm.ts` with a `translate()` / `tag()` interface.
- Implement an OpenAI adapter (current behavior) and a Claude adapter
  (`@anthropic-ai/sdk`, with prompt caching on the static rule preamble).
- Select via an env var (e.g. `LLM_PROVIDER=openai|anthropic`).
- Keep the Zod structured-output schema identical across providers.
- A/B the two on a fixed asset set and compare pass rates + confidence.

> Keep API keys in local env / deployment secrets only — never in the repo.

---

## Suggested order

`Phase 0` → `Phase 2` (cheap, high visibility) → `Phase 1` (fills search with
real tags) → `Phase 4` (reviews) → `Phase 3` (per-buyer ITE) → `Phase 5` (scale).

Each phase: branch → implement → `pnpm lint && pnpm exec tsc --noEmit && pnpm test`
→ PR → merge → deploy.
