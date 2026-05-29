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
-- public reads through a view that strips source_code and test_code
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
