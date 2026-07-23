-- T1.5: rate limiting storage. Fixed-window counters keyed by
-- "<route>:<user-or-ip>", one row per (bucket, window). The increment must be
-- atomic across concurrent requests, so it's done in a single upsert inside a
-- SECURITY DEFINER function rather than a select-then-update from the app.
--
-- No RLS policies are defined, so only the service role (which bypasses RLS)
-- can touch this table directly; anon/authenticated clients never call it via
-- PostgREST and go through increment_rate_limit() instead, which is granted
-- only to service_role.
--
-- Rows are not automatically pruned. At MVP volume this table stays small
-- (~one row per user/IP per route per window); add a scheduled cleanup
-- (`delete from rate_limit_buckets where window_start < now() - interval
-- '1 day'`) alongside T3.4 monitoring once volume justifies it.

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.increment_rate_limit(p_bucket_key text, p_window_start timestamptz)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limit_buckets (bucket_key, window_start, count)
  values (p_bucket_key, p_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limit_buckets.count + 1
  returning count;
$$;

revoke all on function public.increment_rate_limit(text, timestamptz) from public;
grant execute on function public.increment_rate_limit(text, timestamptz) to service_role;
