-- Whop connected-accounts ("Whop for Platforms") model
--
-- Each developer is the merchant of record on their own connected Whop company
-- under the platform's parent company. Buyer payments are split automatically:
-- the platform's cut is taken as application_fee_amount and the remainder lands
-- in the developer's connected balance. Developers withdraw via Whop's hosted
-- payout portal, so no manual payout rail is needed.

-- Developer connected account + KYC state.
alter table public.profiles
  add column if not exists whop_company_id text,
  add column if not exists whop_kyc_complete boolean not null default false;

-- Each asset maps to a product on the developer's connected company.
-- (whop_plan_id was added in 20260529000000_whop_payments.sql.)
alter table public.assets
  add column if not exists whop_product_id text;
