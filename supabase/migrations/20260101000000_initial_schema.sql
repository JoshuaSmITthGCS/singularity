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
  source_language text not null check (source_language in ('typescript', 'javascript', 'java')),
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

-- one verification/adaptation result per asset per target language
create table public.asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  target_language text not null check (target_language in ('typescript', 'javascript', 'java')),
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

-- procurements deliver only variants that pass automated checks
create table public.procurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  variant_id uuid not null references public.asset_variants(id) on delete restrict,
  developer_id uuid not null references public.profiles(id) on delete restrict,
  target_language text not null check (target_language in ('typescript', 'javascript', 'java')),
  delivery_method text not null check (delivery_method in ('github_pr', 'download')),
  target_repo_full_name text,
  target_repo_branch text default 'main',
  price_cents integer not null,
  developer_share_cents integer not null,
  platform_fee_cents integer not null,
  referral_reserve_cents integer not null default 0,
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

-- create a profile row automatically when Supabase Auth creates a user
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    github_username,
    github_user_id,
    display_name,
    avatar_url
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    nullif(new.raw_user_meta_data ->> 'provider_id', '')::bigint,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    github_username = excluded.github_username,
    github_user_id = excluded.github_user_id,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- worker claim function used by the local Node worker
create or replace function public.claim_next_variant(
  p_worker_id text,
  p_timeout_minutes integer default 10
)
returns setof public.asset_variants
security definer
set search_path = public
as $$
begin
  return query
  update public.asset_variants
  set status = 'translating',
      worker_claimed_by = p_worker_id,
      worker_claimed_at = now(),
      started_at = coalesce(started_at, now())
  where id = (
    select id from public.asset_variants
    where (
      status = 'queued'
      or (status in ('translating', 'testing')
          and worker_claimed_at < now() - make_interval(mins => p_timeout_minutes))
    )
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning *;
end;
$$ language plpgsql;
