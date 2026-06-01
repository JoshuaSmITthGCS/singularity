# Singularity MVP Build Prompt (Final)

You are Claude Code (or Codex) working inside VS Code on a fresh project. Read this entire document before writing any code. Build in phases. Verify each phase works locally before moving to the next.

## What we're building

Singularity is a marketplace where developers publish code and clients buy translated versions of that code in their target language. The MVP supports three languages only: Python, JavaScript, and TypeScript.

**The loop the MVP must prove:**

1. Developer connects GitHub OR pastes code directly, picks a code asset to publish, writes a public summary, sets a price
2. Worker translates the asset into the other two target languages and runs tests in all three Docker sandboxes
3. Asset appears in the marketplace once the source-language variant is green. Each language variant shows its own pass/fail badge. Only green variants are buyable.
4. Client browses, finds an asset, picks a green target language, picks delivery method (GitHub PR or download), confirms purchase
5. On confirm, a PR opens in the client's repo or the code becomes downloadable in the procurement page
6. Developer earnings record updates

Stripe is stubbed for MVP. The Buy button creates the procurement directly. Stripe Checkout wires in during Phase 5.

## Tech stack

- **Framework:** Next.js 15 with App Router and TypeScript
- **Database and auth:** Supabase (local via Supabase CLI for dev, hosted Supabase later for prod)
- **UI components:** shadcn/ui with Tailwind CSS
- **GitHub integration:** GitHub App with Octokit
- **LLM:** OpenAI Responses API via `openai`
- **Payments:** Stubbed in MVP. Stripe Checkout in test mode added during Phase 5.
- **Test execution:** Local Docker containers spawned by a Node worker using `dockerode`
- **Package manager:** pnpm

## Local-only setup requirements

Everything runs on the developer's machine with no cloud dependencies except API calls to OpenAI and GitHub. Supabase runs locally via Docker. The test execution worker runs locally via Docker.

### Prerequisites

- Node 20+ and pnpm
- Docker Desktop running
- Supabase CLI (`brew install supabase/tap/supabase` on macOS)
- A GitHub account for creating a GitHub App
- An OpenAI API key

### Setup commands

```bash
pnpm install
cp .env.local.example .env.local
# Developer fills in env vars
supabase start          # Spins up local Postgres + Auth + Storage + Studio
supabase db reset       # Applies migrations and seed data
pnpm dev                # Starts Next.js on localhost:3000
pnpm worker             # Starts the translation worker in a separate terminal
```

Studio is accessible at `localhost:54323`.

## Project structure

```
singularity-mvp/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.local.example
├── .gitignore
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260101000000_initial_schema.sql
│   │   └── 20260101000001_rls_policies.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts
│   │   ├── marketplace/
│   │   │   ├── page.tsx
│   │   │   └── [assetId]/page.tsx
│   │   ├── publish/
│   │   │   └── page.tsx
│   │   ├── procurements/
│   │   │   ├── page.tsx
│   │   │   └── [procurementId]/page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── github/install/route.ts
│   │       ├── github/repos/route.ts
│   │       ├── github/files/route.ts
│   │       ├── assets/route.ts
│   │       ├── assets/[id]/route.ts
│   │       ├── procurements/route.ts
│   │       └── webhooks/github/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── AssetCard.tsx
│   │   ├── PublishForm.tsx
│   │   ├── PasteCodeStep.tsx
│   │   ├── MarketplaceSearch.tsx
│   │   ├── LanguageBadge.tsx
│   │   └── ProcurementStatus.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── github/
│   │   │   ├── app.ts
│   │   │   └── octokit.ts
│   │   └── openai/
│   │       ├── client.ts
│   │       ├── extract-metadata.ts
│   │       └── translate.ts
│   └── types/
│       └── database.ts
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── claim.ts
│   │   ├── translator.ts
│   │   ├── test-runner.ts
│   │   └── deps.ts
│   └── docker/
│       ├── python.Dockerfile
│       ├── node.Dockerfile
│       └── typescript.Dockerfile
└── scripts/
    ├── setup.sh
    └── generate-types.sh
```

## Database schema

`supabase/migrations/20260101000000_initial_schema.sql`:

```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text,
  github_user_id bigint unique,
  github_installation_id bigint,
  display_name text,
  avatar_url text,
  total_earnings_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  github_repo_id bigint not null,
  github_full_name text not null,
  default_branch text not null default 'main',
  connected_at timestamptz not null default now(),
  unique (owner_id, github_repo_id)
);

-- assets: source_code stays private, summary is the public preview
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.profiles(id) on delete cascade,
  repo_id uuid references public.repos(id) on delete set null,
  source_type text not null check (source_type in ('github', 'paste')),
  source_language text not null check (source_language in ('python', 'javascript', 'typescript')),
  title text not null,
  short_description text not null,
  long_description text,
  summary text not null,
  tags text[] not null default '{}',
  source_path text,
  test_path text,
  source_code text not null,
  test_code text not null,
  price_cents integer not null check (price_cents >= 500 and price_cents <= 50000),
  status text not null default 'draft' check (
    status in ('draft', 'verifying', 'published', 'archived', 'flagged')
  ),
  view_count integer not null default 0,
  procurement_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_status on public.assets (status);
create index idx_assets_source_language on public.assets (source_language);
create index idx_assets_developer on public.assets (developer_id);
create index idx_assets_tags on public.assets using gin (tags);

-- one variant per asset per target language, pre-translated at publish time
create table public.asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  target_language text not null check (target_language in ('python', 'javascript', 'typescript')),
  translated_code text,
  translated_tests text,
  adaptation_log text,
  notes_for_pr text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  tests_total integer,
  tests_passed integer,
  tests_failed integer,
  test_output text,
  status text not null default 'queued' check (
    status in ('queued', 'translating', 'testing', 'passed', 'failed')
  ),
  worker_claimed_by text,
  worker_claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, target_language)
);

create index idx_variants_status on public.asset_variants (status);
create index idx_variants_claim on public.asset_variants (status, worker_claimed_at)
  where status in ('queued', 'translating', 'testing');

-- procurements are simple since variants are pre-verified
create table public.procurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  variant_id uuid not null references public.asset_variants(id) on delete restrict,
  developer_id uuid not null references public.profiles(id) on delete restrict,
  target_language text not null check (target_language in ('python', 'javascript', 'typescript')),
  delivery_method text not null check (delivery_method in ('github_pr', 'download')),
  target_repo_full_name text,
  target_repo_branch text default 'main',
  price_cents integer not null,
  developer_share_cents integer not null,
  platform_fee_cents integer not null,
  pr_url text,
  pr_number integer,
  status text not null default 'pending' check (
    status in ('pending', 'delivering', 'delivered', 'failed')
  ),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_procurements_client on public.procurements (client_id);
create index idx_procurements_developer on public.procurements (developer_id);
create index idx_procurements_status on public.procurements (status);

-- developer payment records (bookkeeping only in MVP)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.procurements(id) on delete restrict,
  developer_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create trigger trg_variants_updated_at before update on public.asset_variants
  for each row execute function public.set_updated_at();
create trigger trg_procurements_updated_at before update on public.procurements
  for each row execute function public.set_updated_at();
```

## Row-level security

`supabase/migrations/20260101000001_rls_policies.sql`:

```sql
alter table public.profiles enable row level security;
alter table public.repos enable row level security;
alter table public.assets enable row level security;
alter table public.asset_variants enable row level security;
alter table public.procurements enable row level security;
alter table public.payments enable row level security;

create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "repos_owner_all" on public.repos
  for all using (auth.uid() = owner_id);

-- developer reads full asset row, buyer reads full row only after delivery
create policy "assets_developer_all" on public.assets
  for all using (auth.uid() = developer_id);
create policy "assets_buyer_after_delivery" on public.assets
  for select using (
    exists (
      select 1 from public.procurements p
      where p.asset_id = assets.id
      and p.client_id = auth.uid()
      and p.status = 'delivered'
    )
  );

create policy "variants_developer_all" on public.asset_variants
  for all using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and a.developer_id = auth.uid()
    )
  );
create policy "variants_buyer_after_delivery" on public.asset_variants
  for select using (
    exists (
      select 1 from public.procurements p
      where p.variant_id = asset_variants.id
      and p.client_id = auth.uid()
      and p.status = 'delivered'
    )
  );

create policy "procurements_participant_read" on public.procurements
  for select using (auth.uid() = client_id or auth.uid() = developer_id);
create policy "procurements_client_insert" on public.procurements
  for insert with check (auth.uid() = client_id);

create policy "payments_developer_read" on public.payments
  for select using (auth.uid() = developer_id);

-- public marketplace views strip source_code and test_code
create view public.marketplace_assets as
select
  a.id, a.developer_id, a.source_language, a.title, a.short_description,
  a.long_description, a.summary, a.tags, a.price_cents,
  a.view_count, a.procurement_count, a.created_at
from public.assets a
where a.status = 'published';

create view public.marketplace_variants as
select
  v.id, v.asset_id, v.target_language, v.status, v.confidence,
  v.tests_total, v.tests_passed, v.tests_failed
from public.asset_variants v
join public.assets a on a.id = v.asset_id
where a.status = 'published';

grant select on public.marketplace_assets to anon, authenticated;
grant select on public.marketplace_variants to anon, authenticated;
```

## Environment variables

`.env.local.example`:

```
# Supabase (local defaults after `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# GitHub App
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_ID=worker-local-1
WORKER_POLL_INTERVAL_MS=5000
WORKER_CLAIM_TIMEOUT_MINUTES=10

# Stripe (Phase 5 only, leave blank for MVP)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

The README must include exact steps for creating the GitHub App and getting each value.

## API contracts

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/github/install` | session | Returns the GitHub App install URL for the user |
| GET | `/api/github/repos` | session | Lists repos the user's installation grants access to |
| GET | `/api/github/files?repo=&path=` | session | Lists files in a repo path |
| POST | `/api/assets` | session | Creates an asset (from repo file or pasted code), inserts three asset_variants rows, returns asset id |
| GET | `/api/assets/:id` | mixed | Returns asset detail. Public sees marketplace view fields only. Developer sees full row. Buyer with delivered procurement sees full row. |
| POST | `/api/procurements` | session | Creates a procurement against a green variant, runs delivery inline, returns final status |
| POST | `/api/webhooks/github` | signature | Optional installation event handling |

## Publish flow

`/publish` is a wizard with these steps:

1. **Source**: pick "Connect a repo file" or "Paste code". Paste mode opens two text areas (source + tests) and a language selector. Repo mode walks the file tree to pick a source file and a test file.
2. **Metadata**: title, short description, summary (public preview, required), long description, tags. Show character counters. Summary is what marketplace browsers see before purchase.
3. **Price**: cents input bounded by the schema check constraint.
4. **Confirm**: shows what will be created. On submit:
   - Insert `assets` row with `status='verifying'`
   - Insert three `asset_variants` rows (one per target language) with `status='queued'`
   - Worker picks them up
   - Asset flips to `published` when the source-language variant passes
   - Other two variants populate over time and unlock their language buttons in the marketplace

## The translation worker

The worker is a long-running Node process that polls `asset_variants` for queued or stale rows and processes them one at a time.

### Job claim with locking

```ts
const claim = await sql`
  update asset_variants
  set status = 'translating',
      worker_claimed_by = ${workerId},
      worker_claimed_at = now(),
      started_at = now()
  where id = (
    select id from asset_variants
    where (
      status = 'queued'
      or (status in ('translating', 'testing')
          and worker_claimed_at < now() - interval '10 minutes')
    )
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning *
`
```

### Per-job flow

1. Load the parent asset (source code, tests, source language).
2. If `target_language === source_language`, skip the OpenAI call. Reuse source code and tests as-is.
3. Otherwise call OpenAI (`gpt-5.5`) with structured JSON output: `translated_code`, `translated_tests`, `adaptation_log`, `notes_for_pr`, `confidence`, plus an optional `dependencies` field listing any non-stdlib packages needed. Save these on the variant row.
4. Flip variant to `testing`. Write code + tests to a tmp dir on the host. If `dependencies` is set, write a `requirements.txt` (Python) or `package.json` (Node/TS) into the tmp dir.
5. Run the install stage (network on, 30s, 256MB) if dependencies exist. If install fails, mark variant `failed` with reason "dependency install failed".
6. Run the test stage (network off, 60s, 512MB, 1 CPU, non-root) with the tmp dir mounted read-only at `/workspace`. Parse pass/fail from the JSON reporter.
7. Flip variant to `passed` or `failed`. Set `completed_at`.
8. If this is the source-language variant, just passed, and the parent asset is still `verifying`, flip the asset to `published`.

### Docker setup

Three Dockerfiles in `worker/docker/`, each preinstalling a common-deps allowlist baked at image build:

- **`python.Dockerfile`** (`python:3.12-slim`): pytest, pytest-json-report, numpy, pandas, requests, pydantic
- **`node.Dockerfile`** (`node:20-alpine`): vitest, lodash, zod, axios, date-fns
- **`typescript.Dockerfile`** (`node:20-alpine`): tsx, vitest, typescript, lodash, zod, axios, date-fns

For deps outside the allowlist, the worker runs two stages:

1. **Install stage**: `NetworkMode: 'bridge'`, mounts tmp dir read-write, runs `pip install -r requirements.txt` or `pnpm install`. Capped at 30 seconds, 256MB RAM. Install failure marks the variant as failed.
2. **Test stage**: `NetworkMode: 'none'`, mounts tmp dir read-only, runs the test command with `pytest --json-report` or `vitest --reporter=json`. Capped at 60 seconds, 512MB RAM, 1 CPU, non-root user.

### OpenAI translation prompt

Use the OpenAI SDK with `gpt-5.5`. Require structured JSON output:

```ts
{
  translated_code: string,
  translated_tests: string,
  adaptation_log: string,
  notes_for_pr: string,
  confidence: 'high' | 'medium' | 'low',
  dependencies?: {
    requirements_txt?: string,
    package_json?: string
  }
}
```

System prompt focuses on faithful translation that preserves semantics and passes the original tests when re-expressed in the target language.

## Procurement and delivery flow

`POST /api/procurements` (auth required):

1. Validate `asset_id`, `variant_id`, `delivery_method`. Confirm the variant is `passed` and belongs to the asset.
2. If `delivery_method === 'github_pr'`, validate `target_repo_full_name` and confirm the client has an active installation that includes that repo. If not, return 400 with a message to install the GitHub App.
3. Insert procurement with `status='pending'`. Set `developer_share_cents` to 80% of price, `platform_fee_cents` to the remainder.
4. Set `status='delivering'`. If `github_pr`, open the PR with translated code + tests + the variant's `notes_for_pr` as PR body. If `download`, no GitHub action.
5. Set `status='delivered'`, save `pr_url` if applicable. Insert a `payments` row for the developer with `status='paid'`. Update profile `total_earnings_cents`.
6. Return the procurement. If `download` mode, the procurement page now reads the translated code via RLS and shows it for copy or download.

No Stripe in this flow for MVP.

## Pages and UX

| Route | Purpose |
|-------|---------|
| `/` | Marketing-light landing: hero, how it works (3 steps), CTA to sign in |
| `/auth/callback` | Supabase auth callback handler |
| `/dashboard` | Tabs for "My Assets" (developer view) and "My Procurements" (client view) |
| `/publish` | Wizard: source (repo OR paste), metadata, price, confirm |
| `/marketplace` | Searchable grid of published assets with filters for source language and tags. Each card shows three language badges (✓ / ⏳ / ✗) |
| `/marketplace/[assetId]` | Asset detail: summary, description, language picker with badges. "Buy" CTA is enabled only for ✓ variants. Source code is never shown here. |
| `/procurements/[procurementId]` | Procurement status. If `delivered` and `download`, shows the translated code. If `delivered` and `github_pr`, shows the PR link. |

## Build phases

### Phase 1: Foundation (target: 2-3 days)

- Scaffold Next.js with TypeScript, Tailwind, shadcn/ui
- Initialize Supabase locally, run migrations, verify Studio shows tables and views
- Implement Supabase auth with GitHub provider
- Create the `profiles` row automatically on user creation via a trigger
- Build the `/` and `/dashboard` pages
- Build the GitHub App setup flow: install button, callback, store `github_installation_id`

**Verification:** A user can sign in, install the GitHub App, and see the installation reflected on the dashboard.

### Phase 2: Publishing with source-language verification (target: 3-4 days)

- Build `/publish` wizard with both repo and paste modes
- Implement `/api/github/repos` and `/api/github/files`
- Build the asset creation endpoint that inserts the asset + three variants
- Build the worker scaffolding with the polling loop and `FOR UPDATE SKIP LOCKED` claim
- Build the Python Docker test runner with the two-stage install/test pattern
- Worker handles only the source-language variant (no OpenAI call) for this phase
- Asset flips to `published` when source-language variant passes

**Verification:** A developer can publish a Python file with tests via either repo or paste. The worker tests the source. The asset appears in the marketplace within a minute with the developer's summary as the public preview. Source code is hidden.

### Phase 3: Cross-language translation (target: 3-4 days)

- Implement the OpenAI translation call for non-source-language variants
- Add JS and TS Docker runners with the same two-stage execution
- Marketplace asset detail page shows three language badges that update as variants complete
- Worker handles dependency hints from OpenAI (requirements.txt / package.json)

**Verification:** Within roughly 5 minutes of publishing a Python asset, two more variants populate, run, and either go green or red. The marketplace UI reflects this. Two workers running at once never claim the same variant.

### Phase 4: Procurement and delivery (target: 2-3 days)

- Build the procurement creation endpoint with both delivery modes
- Implement PR creation via Octokit for `github_pr` mode
- Build the download view for `download` mode (RLS-gated)
- Build the developer earnings view on the dashboard

**Verification:** A client can buy a green JavaScript variant of a Python asset, pick PR or download delivery, and either see a PR in their target repo or download the code from the procurement page. Developer earnings update.

### Phase 5: Polish + Stripe (target: 2-3 days)

- Add Stripe Checkout (test mode) in front of procurement creation
- Add basic error states and a manual retry button for failed variants
- README cleanup, env var docs, screenshots of the working flow

**Verification:** The full loop works for all three languages with Stripe Checkout in test mode. Failed variants can be manually retried.

## Out of scope for the MVP

Do not build any of these. If you find yourself reaching for one, stop and ask:

- Any blockchain code, smart contracts, or tokens
- Any game engine integration
- DisCo binary fingerprinting
- ElasticSearch (Postgres full-text search if needed)
- Kubernetes or cloud deployment
- Stripe Connect, transfers, or on-ramp/off-ramp
- Behavioral sandboxes
- Languages beyond Python, JavaScript, TypeScript
- The Engine API Registry
- Real-time status via websockets (polling is fine)
- Mobile app
- Public REST API for third parties

## Acceptance criteria

The MVP is done when:

1. A developer can sign up, install the GitHub App OR skip it and use paste-code, and publish a Python function with pytest tests in under 5 minutes.
2. The published asset appears in the marketplace with the developer-written summary visible. Source code is hidden until purchase.
3. Within roughly 5 minutes of publish, the asset shows two more language variants as either green (purchasable) or red.
4. A client can buy a green JavaScript variant of a Python asset, pick PR or download delivery, and either see a PR in their target repo or download the code from the procurement page.
5. The buyer can read the full source code and translated code only after the procurement reaches `delivered`. Before that, RLS blocks access.
6. The developer's earnings dashboard shows the new payment row after delivery completes.
7. Two worker processes running simultaneously never claim the same variant. Stale claims older than 10 minutes are reclaimed automatically.
8. All of the above works on a fresh clone with `pnpm install && supabase start && pnpm dev && pnpm worker` and the env vars filled in. No Stripe key required for MVP.

## Coding conventions

- TypeScript strict mode on
- Use Supabase typed clients via `pnpm run generate-types` (which runs `supabase gen types typescript --local > src/types/database.ts`)
- Server components by default, client components only when interactivity requires it
- No magic numbers, name every constant
- All API routes return `{ data, error }` shape
- Throw early, validate input with `zod` at API boundaries
- Active voice in comments and PR descriptions
- No semicolons or em dashes in user-facing copy or markdown
- Error messages are short and tell the user what to do next

## Final notes

Build the MVP loop first. If something feels like it needs scale or fancy infra and we don't already need it for the eight acceptance criteria above, defer it.

Start with Phase 1. Show me the file tree and the first migration before writing any application code.
