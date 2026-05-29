-- Align the MVP language matrix with the current product scope:
-- TypeScript, JavaScript, and Java.

alter table public.assets
  drop constraint if exists assets_source_language_check;

alter table public.assets
  add constraint assets_source_language_check
  check (source_language in ('typescript', 'javascript', 'java')) not valid;

alter table public.asset_variants
  drop constraint if exists asset_variants_target_language_check;

alter table public.asset_variants
  add constraint asset_variants_target_language_check
  check (target_language in ('typescript', 'javascript', 'java')) not valid;

alter table public.procurements
  drop constraint if exists procurements_target_language_check;

alter table public.procurements
  add constraint procurements_target_language_check
  check (target_language in ('typescript', 'javascript', 'java')) not valid;

alter table public.procurements
  add column if not exists referral_reserve_cents integer not null default 0;
