-- Unit economics: record what each translation actually cost so per-asset
-- margin is measurable (docs/PRICING.md). Written by the worker (service
-- role); columns are nullable because source-language variants make no LLM
-- call and historical rows predate tracking.

alter table asset_variants
  add column if not exists model text,
  add column if not exists tokens_input bigint,
  add column if not exists tokens_output bigint,
  add column if not exists translation_cost_cents integer;

comment on column asset_variants.model is 'Model that produced the persisted translation (last attempt when escalated)';
comment on column asset_variants.tokens_input is 'Total input tokens across attempts, including cache reads/writes';
comment on column asset_variants.tokens_output is 'Total output tokens across attempts';
comment on column asset_variants.translation_cost_cents is 'Estimated LLM spend for this variant, in cents';
