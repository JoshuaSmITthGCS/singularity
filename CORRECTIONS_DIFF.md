# Singularity MVP — Corrections Patch

Paste these sections over the matching ones in the original build prompt before handing it to Claude Code.

## Architecture changes (read first)

1. **Translation moves to publish time.** When a developer publishes, the worker translates the source into the other two target languages and runs the translated tests in Docker. The source language is also tested as-is. Only language variants that pass tests become purchasable. Marketplace shows per-language status badges.
2. **Paste-code publishing.** Developers can paste source and tests directly instead of picking a file from a connected repo. Both paths produce the same `assets` row, distinguished by `source_type`.
3. **Stripe is stubbed for MVP.** No Checkout, no Connect, no webhooks. The "Buy" button creates the procurement directly and goes straight to delivery. Stripe wires up in a later phase.
4. **Delivery has two modes.** `github_pr` opens a PR in the client's repo (requires client to have the GitHub App installed). `download` returns the code in the UI. Client picks at checkout.
5. **Developer-written summary.** At publish time, the developer writes a short summary that serves as the public marketplace preview. Full source is never exposed before purchase.
6. **Worker job locking.** Variants use `worker_claimed_by` + `worker_claimed_at` with `SELECT FOR UPDATE SKIP LOCKED`. Reclaim stale claims after 10 minutes.

## Replacement migration: `20260101000000_initial_schema.sql`

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

-- procurements are simple now since variants are pre-verified
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

-- developer payment records (no Stripe transfers in MVP, just bookkeeping)
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

## Replacement RLS: `20260101000001_rls_policies.sql`

```sql
alter table public.profiles enable row level security;
alter table public.repos enable row level security;
alter table public.assets enable row level security;
alter table public.asset_variants enable row level security;
alter table public.procurements enable row level security;
alter table public.payments enable row level security;

-- profiles
create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- repos
create policy "repos_owner_all" on public.repos
  for all using (auth.uid() = owner_id);

-- assets: developer reads full row, buyer reads full row only after delivery,
-- public reads through a view (defined below) that strips source_code and test_code
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

-- variants: developer reads full row, buyer reads full row only after delivery
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

-- procurements
create policy "procurements_participant_read" on public.procurements
  for select using (auth.uid() = client_id or auth.uid() = developer_id);
create policy "procurements_client_insert" on public.procurements
  for insert with check (auth.uid() = client_id);

-- payments
create policy "payments_developer_read" on public.payments
  for select using (auth.uid() = developer_id);

-- public marketplace view: strips source_code and test_code
create view public.marketplace_assets as
select
  a.id,
  a.developer_id,
  a.source_language,
  a.title,
  a.short_description,
  a.long_description,
  a.summary,
  a.tags,
  a.price_cents,
  a.view_count,
  a.procurement_count,
  a.created_at
from public.assets a
where a.status = 'published';

create view public.marketplace_variants as
select
  v.id,
  v.asset_id,
  v.target_language,
  v.status,
  v.confidence,
  v.tests_total,
  v.tests_passed,
  v.tests_failed
from public.asset_variants v
join public.assets a on a.id = v.asset_id
where a.status = 'published';

grant select on public.marketplace_assets to anon, authenticated;
grant select on public.marketplace_variants to anon, authenticated;
```

## Updated publish flow

The `/publish` route is now a wizard with these steps:

1. **Source**: pick "Connect a repo file" or "Paste code". The paste option opens two text areas (source + tests) with a language selector.
2. **Metadata**: title, short description, summary (public preview, required), long description (optional), tags. Show character counters. Summary is what marketplace browsers see before purchase.
3. **Price**: cents input bounded by the schema check constraint.
4. **Confirm**: shows what will be created. On submit, asset row is created with `status='verifying'` and three `asset_variants` rows are inserted (one per target language) with `status='queued'`. The asset stays in `verifying` until at least the source-language variant passes. Asset flips to `published` once the source-language variant is `passed`. The other two variants populate over time and unlock their language buttons in the marketplace as they finish.

## Updated worker flow

The worker polls `asset_variants` instead of procurements. One loop, one claim, one job at a time per worker process.

```ts
// pseudocode, run inside a transaction per claim
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
      or (status in ('translating', 'testing') and worker_claimed_at < now() - interval '10 minutes')
    )
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning *
`
```

Then for the claimed variant:

1. Load the parent asset (source code, tests, source language).
2. If `target_language === source_language`, skip the OpenAI call. Reuse source as-is.
3. Otherwise call OpenAI (`gpt-5.5`) with structured JSON output: `translated_code`, `translated_tests`, `adaptation_log`, `notes_for_pr`, `confidence`. Save these on the variant row.
4. Flip variant to `testing`. Write code + tests to a tmp dir on the host.
5. Run the language-appropriate Docker container (see below) with the tmp dir mounted read-only at `/workspace`. Parse pass/fail from the JSON reporter.
6. Flip variant to `passed` or `failed`. Set `completed_at`.
7. If this is the source-language variant and it just passed, and the parent asset is still `verifying`, flip the asset to `published`.

No procurement-side worker logic. Procurements go straight from `pending` to `delivering` to `delivered` in the API route when the buyer clicks Buy.

## Updated Docker setup (preinstall + scoped install)

Each Dockerfile preinstalls a small common-deps allowlist baked at image build time:

- **Python (`python:3.12-slim`)**: pytest, pytest-json-report, numpy, pandas, requests, pydantic
- **Node (`node:20-alpine`)**: vitest, lodash, zod, axios, date-fns
- **TypeScript (`node:20-alpine`)**: tsx, vitest, typescript, lodash, zod, axios, date-fns

For deps outside the allowlist, the worker runs a two-stage execution per test job:

1. **Install stage**: container starts with `NetworkMode: 'bridge'`, mounts the tmp dir read-write, runs `pip install -r requirements.txt` or `pnpm install` if a manifest exists in the tmp dir. Capped at 30 seconds, 256MB RAM. If install fails, mark variant `failed` with reason "dependency install failed".
2. **Test stage**: container restarts with `NetworkMode: 'none'`, mounts the same tmp dir read-only, runs the test command. Capped at 60 seconds, 512MB RAM, 1 CPU, non-root user.

OpenAI is instructed in its translation prompt to emit a `requirements.txt` or `package.json` block when the translation needs deps beyond stdlib. Worker parses those out of the translation response and writes them into the tmp dir before stage 1.

## Updated procurement / delivery flow

`POST /api/procurements` (auth required):

1. Validate `asset_id`, `variant_id`, `delivery_method`. Confirm the variant is `passed` and belongs to that asset.
2. If `delivery_method === 'github_pr'`, validate `target_repo_full_name` and confirm the client has an active installation that includes that repo. If not, return 400 with a message to install the GitHub App.
3. Insert procurement row with `status='pending'`. Calculate `developer_share_cents` (e.g. 80%) and `platform_fee_cents`.
4. Set `status='delivering'`. If `github_pr`, open the PR with the translated code + tests + adaptation log as PR body. If `download`, no GitHub action.
5. Set `status='delivered'`, `pr_url` if applicable. Insert a `payments` row for the developer. Update profile `total_earnings_cents`.
6. Return the procurement with `download_payload` populated if `delivery_method === 'download'`.

No Stripe in this flow for MVP. Replace with Stripe Checkout + manual capture in a later phase.

## Updated phases

| Phase | Target | Goal |
|-------|--------|------|
| 1 | 2-3 days | Auth, GitHub App install, dashboard, basic schema |
| 2 | 3-4 days | Publish wizard (both repo + paste), asset + variants insert, worker scaffolding with job locking, Docker test runner for Python only, source-language verification flipping asset to `published` |
| 3 | 3-4 days | OpenAI translation for the other two languages, JS + TS Docker runners, two-stage install/test execution, marketplace shows per-language badges |
| 4 | 2-3 days | Procurement flow with both delivery modes, PR creation via Octokit, developer earnings view |
| 5 | 2-3 days | Stripe Checkout (test mode), error states, retries for stuck variants, polish |

## Updated acceptance criteria

1. A developer can sign up, install the GitHub App OR skip it and use paste-code, and publish a Python function with pytest tests in under 5 minutes.
2. The published asset appears in the marketplace with the developer-written summary visible, source code hidden until purchase.
3. Within roughly 5 minutes of publish, the asset shows two more language variants as either green (purchasable) or red (not).
4. A client account can buy a green JavaScript variant of a Python asset, pick PR or download delivery, and either see a PR in their target repo or download the code from the procurement page.
5. The buyer can read the full source code and translated code only after the procurement reaches `delivered`. Before that, RLS blocks it.
6. The developer's earnings dashboard shows the payment row after delivery completes.
7. Two worker processes running simultaneously never claim the same variant. Stale claims older than 10 minutes are reclaimed automatically.
8. All of the above works on a fresh clone with `pnpm install && supabase start && pnpm dev && pnpm worker` and the env vars filled in. No Stripe key required for MVP.
