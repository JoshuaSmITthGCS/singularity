-- TRD alignment: structured TagSchema, client environment config, asset
-- quality/complexity/UID anchoring, and formula-based pricing.
-- See Tech & Product Requirements Document §3.3, §4.5, §5.1, §7.2, §7.4.

-- §3.3 / §7.2: immutable Singularity UID + on-chain address anchor on users.
alter table public.profiles
  add column if not exists singularity_uid uuid not null default gen_random_uuid(),
  add column if not exists onchain_address varchar(42);

create unique index if not exists profiles_singularity_uid_key
  on public.profiles (singularity_uid);

-- §7.2: asset content hash + blockchain UID + computed quality/complexity.
-- price_cents stays but is now derived from the §7.4 formula, not user input.
alter table public.assets
  add column if not exists blockchain_uid varchar(66),
  add column if not exists content_hash varchar(64),
  add column if not exists quality_score numeric(3,2),
  add column if not exists complexity varchar(10)
    check (complexity is null or complexity in ('low', 'medium', 'high'));

-- §4.5: versioned, structured tag records. Deterministic + LLM-assisted tags
-- with confidence + source provenance. Developer overrides win over llm_v1.
create table if not exists public.asset_tags (
  id                 uuid primary key default gen_random_uuid(),
  asset_id           uuid not null references public.assets(id) on delete cascade,
  version            integer not null default 1,
  source             varchar(50) not null check (source in ('llm_v1', 'developer', 'admin')),
  genre              text[] not null default '{}',
  purpose            text[] not null default '{}',
  actions            text[] not null default '{}',
  keywords           text[] not null default '{}',
  compatible_engines text[] not null default '{}',
  complexity         varchar(10),
  short_description  text,
  long_description   text,
  confidence_score   numeric(3,2),
  created_at         timestamptz not null default now(),
  unique (asset_id, version)
);

create index if not exists idx_asset_tags_asset on public.asset_tags (asset_id);
create index if not exists idx_asset_tags_genre on public.asset_tags using gin (genre);
create index if not exists idx_asset_tags_purpose on public.asset_tags using gin (purpose);
create index if not exists idx_asset_tags_actions on public.asset_tags using gin (actions);
create index if not exists idx_asset_tags_engines on public.asset_tags using gin (compatible_engines);

-- §5.1: client native development environment configuration. Drives the ITE
-- (target language/engine, unit system, naming convention, delivery mode).
create table if not exists public.client_env_configs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  primary_language    varchar(50) not null,
  secondary_languages text[] not null default '{}',
  target_engine       varchar(50),
  unit_system         varchar(10) not null default 'metric'
    check (unit_system in ('metric', 'imperial')),
  naming_convention   varchar(20)
    check (naming_convention is null or naming_convention in ('snake_case', 'camelCase', 'PascalCase')),
  repo_target         text,
  target_branch       varchar(200) not null default 'main',
  pr_mode             boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id)
);

create trigger client_env_configs_set_updated_at
  before update on public.client_env_configs
  for each row execute function public.set_updated_at();

-- RLS: a user reads/writes only their own env config.
alter table public.client_env_configs enable row level security;

create policy client_env_owner_all on public.client_env_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- asset_tags follow the parent asset's visibility: developer full access,
-- public read for tags of published assets via the search view below.
alter table public.asset_tags enable row level security;

create policy asset_tags_developer_all on public.asset_tags
  for all using (
    exists (select 1 from public.assets a where a.id = asset_id and a.developer_id = auth.uid())
  )
  with check (
    exists (select 1 from public.assets a where a.id = asset_id and a.developer_id = auth.uid())
  );

-- §5.2: public marketplace search view joining published assets to their latest
-- tag version. Exposes the structured filter fields without leaking source code.
create or replace view public.marketplace_search as
select
  a.id,
  a.developer_id,
  a.source_language as primary_language,
  a.title,
  a.short_description,
  a.summary,
  a.price_cents,
  a.quality_score,
  a.complexity,
  a.view_count,
  a.procurement_count,
  a.created_at,
  t.genre,
  t.purpose,
  t.actions,
  t.keywords,
  t.compatible_engines
from public.assets a
left join lateral (
  select genre, purpose, actions, keywords, compatible_engines
  from public.asset_tags
  where asset_id = a.id
  order by version desc
  limit 1
) t on true
where a.status = 'published';

grant select on public.marketplace_search to anon, authenticated;
