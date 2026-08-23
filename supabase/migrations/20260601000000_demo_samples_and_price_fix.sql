-- Fix the price_cents floor to match the actual §7.4 formula minimum
-- (BASE_PRICE_CENTS=50 x low complexity multiplier 1.0 = 50 cents), which the
-- original $5 floor from the initial schema was never reconciled against —
-- any real low-complexity asset would fail this constraint on publish today.
alter table public.assets drop constraint assets_price_cents_check;
alter table public.assets add constraint assets_price_cents_check
  check (price_cents >= 50 and price_cents <= 50000);

-- Marks assets created by the public "try it" walkthrough (/try-it). These
-- are fixed, pre-vetted sample snippets, never arbitrary user input — the
-- flag lets the demo API routes safely expose full source/translated code
-- for these specific assets (server-side, admin client, always filtered on
-- this column) without touching the RLS model that keeps every real
-- developer's code private until purchase.
alter table public.assets add column is_demo_sample boolean not null default false;

-- Lightweight abuse guard for POST /api/demo/publish: one submission per IP
-- per cooldown window, checked/logged server-side with the admin client.
create table public.demo_publish_log (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);
create index idx_demo_publish_log_ip_created on public.demo_publish_log (ip, created_at);

alter table public.demo_publish_log enable row level security;
-- No policies: this table is only ever touched by the admin (service role)
-- client from server routes, never by anon/authenticated clients directly.
