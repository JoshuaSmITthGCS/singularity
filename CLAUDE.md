# Singularity — AI-Verified Multi-Language Code Marketplace

> **For Claude / contributors:** This file is the single source of truth for how
> the codebase is laid out and how it behaves. It overrides assumptions from
> training data. If you change architecture, update this file in the same PR.

---

## 1. What this is (in one paragraph)

**Singularity** is a marketplace for **game-development code assets**. A developer
publishes a piece of source code + its tests **once**, in any one of five
supported languages. The platform uses an LLM to **translate** that asset into
the other languages, **runs the translated tests in a Docker sandbox**, and only
lists variants that **actually pass**. Buyers browse the marketplace, see a
green/yellow/red verification badge per language, and purchase a variant in the
language/engine they actually use — delivered as a GitHub PR or a direct
download. Payments and payouts run through **Whop**; the developer keeps the
majority of each sale.

The differentiator is **verified translation**: buyers never receive code that
hasn't been compiled and tested in the target language first.

---

## 2. Supported languages & engines

The language matrix is **game-dev oriented** (defined in `src/lib/constants.ts`):

| Language     | Primary engines / runtimes                        |
| ------------ | ------------------------------------------------- |
| `typescript` | Node.js, Phaser, Babylon.js, Three.js             |
| `javascript` | Node.js, Phaser, PixiJS, web                       |
| `java`       | libGDX, jMonkeyEngine, Minecraft mods, Android     |
| `csharp`     | Unity, Godot, MonoGame, .NET                       |
| `cpp`        | Unreal Engine, custom/native engines               |

Because the audience is game developers, translation is **physics- and
engine-aware**: the worker converts coordinate systems, unit scales, gravity
constants, naming conventions, and engine API calls between targets (see §6.3
of the TRD and `worker/src/translator.ts`).

> **Note:** There is **no Python** in this codebase. Earlier drafts of the docs
> mentioned Python/Stripe/GPT — those are stale. The real stack is below.

---

## 3. Technology stack (actual)

**Frontend & API** — Next.js 15.5 (App Router, Turbopack), React 19, TypeScript
(strict), Tailwind CSS 4, shadcn-style primitives in `src/components/ui`,
`lucide-react` icons. Validation with **Zod 4**.

**Database & Auth** — Supabase (Postgres + Auth + Row-Level Security). GitHub
OAuth as the auth provider. Generated types in `src/types/database.ts`.

**AI translation** — Anthropic Claude (`@anthropic-ai/sdk`, model from
`ANTHROPIC_MODEL`, default `claude-opus-4-8`) via the Messages API with Zod-typed
structured output (`output_config.format`), adaptive thinking, and prompt caching
on the static translation-rules preamble. Lives in the worker.

**Test execution** — Docker sandboxes, one image per language
(`worker/docker/*.Dockerfile`), driven by `dockerode`. Two-stage: install
(network on, tight limits) → test (network off, read-only fs).

**Payments** — **Whop** ("Whop for Platforms" / connected accounts). Developers
connect a child company under the platform parent company; buyers check out via
Whop; webhooks confirm payment and trigger delivery; payouts go to the developer.

**Background worker** — long-running Node process (`worker/`), run with `tsx`,
polls the DB for translation jobs using `FOR UPDATE SKIP LOCKED`.

---

## 4. Demo mode vs. real backend

The app **boots with zero external services** by default. `src/lib/demo-mode.ts`:

```ts
isDemoMode() === true  // unless NEXT_PUBLIC_REAL_BACKEND="true" AND SINGULARITY_REAL_BACKEND="true"
```

- **Demo mode (default):** all API routes and pages serve seeded fixtures from
  `src/lib/demo-data.ts`. Publish/purchase are simulated. No Supabase, Whop,
  GitHub, Anthropic, or Docker required. This is what runs on a fresh clone.
- **Real backend:** set both `NEXT_PUBLIC_REAL_BACKEND=true` and
  `SINGULARITY_REAL_BACKEND=true`, supply the env vars, and the same routes hit
  Supabase / Whop / GitHub / the worker.

**When editing any API route or data-loading function, handle the demo branch
first, then the real branch.** Every route in `src/app/api/**` follows this
pattern — keep it consistent.

---

## 5. Repository layout

```
singularity/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # Landing page
│   │   ├── marketplace/                  # Browse grid + [assetId] detail
│   │   ├── publish/                      # Publish wizard page
│   │   ├── dashboard/                    # Developer dashboard
│   │   ├── procurements/                 # Purchase history + [id] delivery view
│   │   ├── auth/callback/                # Supabase OAuth callback
│   │   ├── .well-known/security.txt/     # RFC 9116 disclosure (TRD §11.4)
│   │   └── api/
│   │       ├── assets/                   # POST create, [id] read/update
│   │       ├── procurements/             # POST purchase + inline delivery
│   │       ├── search/                   # GET structured + free-text search
│   │       ├── client/env-config/        # GET/PUT client environment config
│   │       ├── github/                   # repos, files, install
│   │       ├── whop/                      # connect, payouts
│   │       ├── webhooks/                 # github, whop
│   │       ├── health/                   # liveness probe (TRD §2.1)
│   │       └── ready/                    # readiness probe (TRD §2.1)
│   │
│   ├── components/                       # React components
│   │   ├── ui/                           # primitives (button, input, ...)
│   │   ├── AssetCard, LanguageBadge      # marketplace cards + status badges
│   │   ├── PublishForm                   # publish wizard (source→catalog→pricing→verify)
│   │   ├── PurchaseForm, ProcurementStatus
│   │   ├── MarketplaceSearch             # search/filter UI
│   │   ├── WhopConnectButton, WhopPayoutsButton, GitHubInstallButton
│   │   └── SiteHeader, AuthButton, ServiceNotice
│   │
│   ├── lib/
│   │   ├── supabase/                     # client / server / admin / middleware
│   │   ├── github/                       # app auth + octokit client
│   │   ├── whop/                         # client, config, webhook verification
│   │   ├── marketplace/                  # queries.ts (listings) + search.ts (filters)
│   │   ├── procurements/                 # delivery logic (PR / download), revenue split
│   │   ├── taxonomy.ts                   # TagSchema controlled vocabulary (TRD §4.5)
│   │   ├── pricing.ts                    # unit-economics pricing formula (TRD §7.4)
│   │   ├── validation.ts                 # all Zod schemas
│   │   ├── api.ts                        # dataResponse / errorResponse envelopes (TRD §8.2)
│   │   ├── constants.ts                  # languages, splits, limits
│   │   ├── demo-mode.ts, demo-data.ts    # demo toggle + fixtures
│   │   └── env-validation.ts             # required env-var checks
│   │
│   └── types/database.ts                 # Supabase row/insert/view types
│
├── worker/
│   ├── src/
│   │   ├── index.ts                      # main poll→translate→test→publish loop
│   │   ├── claim.ts                      # SKIP LOCKED job claiming
│   │   ├── translator.ts                 # Claude translation + engine adaptation rules
│   │   ├── test-runner.ts                # Docker two-stage execution
│   │   ├── pricing.ts                    # worker-side mirror of pricing formula
│   │   ├── db.ts, config.ts, types.ts
│   └── docker/                           # node / typescript / java / csharp / cpp Dockerfiles
│
├── supabase/
│   ├── migrations/                       # ordered SQL migrations (see §7)
│   ├── config.toml
│   └── seed.sql
│
├── README.md                             # quick start
├── INVESTOR.md                           # business model + PRD/tech overview
└── CLAUDE.md                             # this file
```

---

## 6. End-to-end flows

### 6.1 Publish
1. Developer opens `/publish` (`PublishForm`). Steps: **Source → Catalog →
   Pricing → Verify**.
   - Source: paste code+tests, or pick a connected GitHub repo's files.
   - Catalog: title, descriptions, summary, freeform keyword tags.
   - **Pricing: developer picks a _complexity tier_, not a price.** Price is
     computed by the formula (§8); the form shows the estimate live.
2. `POST /api/assets` validates with `createAssetSchema`, computes the initial
   price (`computeAssetPriceCents`), hashes the source (`content_hash`), inserts
   the `assets` row (`status: 'verifying'`), writes a v1 `asset_tags` record
   (`source: 'developer'`), and inserts one `asset_variants` row per language
   (`status: 'queued'`).

### 6.2 Translate & verify (worker)
`worker/src/index.ts` loops:
1. `claimNextVariant()` claims a queued variant with `SKIP LOCKED`.
2. Loads the parent asset.
3. If the variant language **==** the source language, reuse code/tests as-is;
   otherwise call `translateVariant()` (Claude) to translate code + tests and
   produce an `adaptation_log`, PR notes, confidence, and dependency manifests.
4. `runTests()` executes in the language's Docker image (install stage →
   network-off test stage). Result → variant `status: passed | failed` + counts.
5. When the **source-language** variant passes and the asset is still
   `verifying`, the worker computes a `quality_score` from the test results,
   **reprices** the asset via the formula, and flips it to `published`.

### 6.3 Marketplace, search, purchase
- `/marketplace` lists `published` assets (`lib/marketplace/queries.ts`).
- `GET /api/search` (`lib/marketplace/search.ts`) does structured filtering
  (genre/purpose/actions/engine/complexity/language) + light free-text over the
  `marketplace_search` view, returning 5–10 results and an `expanded` fallback
  set when strict matches are thin.
- `/marketplace/[assetId]` shows the summary; code stays hidden. The buy button
  is enabled only for `passed` variants.
- `POST /api/procurements` validates the variant is `passed`, creates a
  procurement, runs delivery inline (`lib/procurements`), splits revenue, records
  payment, and updates developer earnings. Whop confirms payment via webhook.

### 6.4 Delivery
- **GitHub PR:** opens a PR in the buyer's repo with translated code+tests and
  adaptation notes in the body.
- **Download:** RLS grants the buyer read access; the procurement page renders
  the code for copy/download.

---

## 7. Database schema (high level)

Migrations in `supabase/migrations/` (apply in filename order):

| Migration | Adds |
| --- | --- |
| `20260101000000_initial_schema` | `profiles`, `repos`, `assets`, `asset_variants`, `procurements`, `payments`, `set_updated_at()` trigger fn |
| `20260101000001_rls_policies` | RLS + `marketplace_assets` / `marketplace_variants` public views |
| `20260526… / 20260527…` | language matrix → adds Java, then C#/C++ |
| `20260529… (x2)` | Whop payments + connected accounts |
| `20260530000000_trd_alignment` | `asset_tags` (versioned structured tags), `client_env_configs`, `marketplace_search` view; `singularity_uid`/`onchain_address` on profiles; `content_hash`/`blockchain_uid`/`quality_score`/`complexity` on assets |

**Key tables:**
- `profiles` — user + GitHub metadata, earnings, `singularity_uid` (immutable
  per-user anchor), optional `onchain_address`, Whop company id.
- `assets` — source/tests (private), public summary/descriptions, `complexity`,
  `quality_score`, `content_hash`, `price_cents`, `status`.
- `asset_variants` — one per language; translated code/tests, `adaptation_log`,
  test counts, `status`, worker claim fields.
- `asset_tags` — **versioned** structured tags (`genre`, `purpose`, `actions`,
  `keywords`, `compatible_engines`, `complexity`) with `source`
  (`developer`/`llm_v1`/`admin`) and `confidence_score`.
- `client_env_configs` — per-user native environment (primary/secondary
  languages, target engine, unit system, naming convention, repo/branch,
  pr_mode) — the instruction set for translation/delivery.
- `procurements` / `payments` — purchase records + earnings bookkeeping.

**Privacy patterns:** source code is visible only to the developer, the buyer
after a delivered procurement, and the worker (service role). Public access is
always through the `marketplace_*` views, which omit code.

---

## 8. Pricing & revenue (where the money logic lives)

- **Price is computed, never user-set** (`src/lib/pricing.ts`, mirrored in
  `worker/src/pricing.ts`):
  `price = BASE × complexity_multiplier + quality_score × quality_bonus`.
  Base `$0.50`; multipliers low/med/high = `1.0 / 2.5 / 5.0`; quality bonus
  `$0.20`/point on a 0–5 scale. Initial price uses complexity only; the worker
  adds the quality bonus after verification.
- **Revenue split (`src/lib/constants.ts`):** developer **70%**, platform
  **25%**, referral reserve **5%** (`DEVELOPER_SHARE_RATE` etc.). Applied in
  `lib/procurements` and `computeRevenueSplitCents`.

---

## 9. API conventions

- **Responses** always use the envelopes in `src/lib/api.ts`:
  - success → `{ data, error: null }`
  - error → `{ data: null, error: "<message>", error_detail: { code, message, request_id, documentation_url } }`
  - `error` stays a plain string for backward compat; `error_detail` is the
    structured TRD §8.2 form. 401s set `WWW-Authenticate`.
- **Validation:** every request body/query is parsed with a Zod schema from
  `src/lib/validation.ts`. Never trust raw input.
- **Never leak** stack traces, DB error internals, or secrets in responses.

---

## 10. Local development

```bash
corepack enable
pnpm install

# Fastest path — demo mode, no services:
pnpm dev                      # http://localhost:3000

# Real backend:
cp .env.local.example .env.local   # fill in Supabase / Whop / GitHub / Anthropic
# set NEXT_PUBLIC_REAL_BACKEND=true and SINGULARITY_REAL_BACKEND=true
supabase start && supabase db reset
pnpm run worker:build-images       # build the 5 Docker test images
pnpm dev                           # terminal 1
pnpm worker                        # terminal 2 (translation worker)
```

**Checks before pushing:**
```bash
pnpm lint
pnpm exec tsc --noEmit
```

---

## 11. Code style & conventions

- TypeScript strict; **no semicolons**; functional React components.
- Server Components by default; add `"use client"` only when needed.
- Comments in active voice, sparing, explaining *why*. Reference TRD sections
  (e.g. `§7.4`) when a rule comes from the spec.
- Keep the **demo-mode branch first** in every route/loader.
- Tailwind for styling; reuse `components/ui` primitives.
- Commit style: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

---

## 12. Operational endpoints

- `GET /api/health` — liveness (process up).
- `GET /api/ready` — readiness (required config present; 503 if not).
- `GET /.well-known/security.txt` — vulnerability disclosure contact.

---

## 13. Status & deferred work

**Implemented (MVP):** publish (paste + GitHub), Claude translation with
engine-aware adaptation, Docker verification across all five languages,
marketplace with verification badges, structured TagSchema + filtered search,
formula pricing, client env config, GitHub PR + download delivery, Whop
payments/connected accounts/payouts, developer earnings, demo mode.

**Deferred (described in the TRD, intentionally not built at MVP scale):**
on-chain/blockchain contracts (only the data anchors exist), gVisor sandboxing,
ElasticSearch + semantic re-ranking (search is Postgres array-overlap today),
Kubernetes/microservice split, the LLM auto-tagging phase that writes `llm_v1`
tag versions. See `INVESTOR.md` for the rationale and roadmap.

---

**Last updated:** 2026-06-01 · **Version:** 1.0 (MVP)
