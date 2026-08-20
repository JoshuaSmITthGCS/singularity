-- T1.3: defense in depth alongside the atomic claim in
-- src/lib/procurements/fulfill.ts. Prevents the same Whop payment id from
-- ever being attached to two different procurement rows — updating a row to
-- the payment id it already holds is unaffected (uniqueness is checked
-- against other rows), so normal webhook retries for the same procurement
-- are unaffected; only a genuine cross-procurement collision is rejected.
create unique index if not exists idx_procurements_whop_payment_id_unique
  on public.procurements (whop_payment_id)
  where whop_payment_id is not null;
