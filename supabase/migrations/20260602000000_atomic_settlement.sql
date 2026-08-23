-- Settlement bookkeeping was a read-modify-write from the application: read
-- total_earnings_cents, add the share, write it back. Two procurements settling
-- concurrently read the same value and one increment was lost — the developer
-- was silently underpaid. procurement_count had the same race.
--
-- Both increments move into one statement so Postgres serialises them on the
-- row lock instead.

create or replace function public.record_procurement_settlement(
  p_asset_id uuid,
  p_developer_id uuid,
  p_developer_share_cents integer
)
returns void
security definer
set search_path = public
language sql
as $$
  with bump_asset as (
    update public.assets
    set procurement_count = procurement_count + 1
    where id = p_asset_id
  )
  update public.profiles
  set total_earnings_cents = total_earnings_cents + p_developer_share_cents
  where id = p_developer_id;
$$;

-- Delivery runs under the service role only; no anon/authenticated grant.
revoke all on function public.record_procurement_settlement(uuid, uuid, integer) from public;
revoke all on function public.record_procurement_settlement(uuid, uuid, integer) from anon;
revoke all on function public.record_procurement_settlement(uuid, uuid, integer) from authenticated;
