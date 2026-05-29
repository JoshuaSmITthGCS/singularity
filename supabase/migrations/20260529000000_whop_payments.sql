-- Whop payment integration
-- Buyers pay through Whop checkout; a webhook confirms payment before delivery.
-- Whop collects the full payment into the platform account; developer payouts
-- are settled out-of-band, so the payments ledger records what each developer is owed.

-- Extend procurement lifecycle with payment states.
-- awaiting_payment: checkout created, waiting for the buyer to pay on Whop
-- paid:             Whop confirmed payment, ready to deliver
alter table public.procurements
  drop constraint if exists procurements_status_check;

alter table public.procurements
  add constraint procurements_status_check check (
    status in ('pending', 'awaiting_payment', 'paid', 'delivering', 'delivered', 'failed')
  );

-- Track the Whop checkout + payment so the webhook can reconcile back to a procurement.
alter table public.procurements
  add column if not exists whop_checkout_id text,
  add column if not exists whop_payment_id text;

create index if not exists idx_procurements_whop_checkout_id
  on public.procurements (whop_checkout_id);

-- Each asset maps to a Whop plan (created lazily on first purchase) so checkout
-- can charge the asset's price.
alter table public.assets
  add column if not exists whop_plan_id text;
