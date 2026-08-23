# Going live: Supabase + Whop setup

Everything for payments is built. To make the app functional you only need to
(1) stand up Supabase, (2) create a Whop platform company + keys, and (3) set
env vars. No code changes required.

## 1. Supabase

1. Create a project at supabase.com.
2. Run the migrations (creates all tables, views, RLS, and the Whop columns):
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
3. Enable the **GitHub** auth provider (Authentication → Providers).
4. Grab from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Whop (connected-accounts model)

1. In the Whop dashboard, pick the company that will be your **platform parent**.
   Copy its id from the URL (`biz_...`) → `WHOP_PLATFORM_COMPANY_ID`.
2. Create a **Company API key** (Developer → API Keys) with the
   `access_pass:create` scope → `WHOP_API_KEY`.
3. Create a **webhook** (Developer → Webhooks):
   - URL: `https://<your-domain>/api/webhooks/whop`
   - **Enable "Connected account events"** — required, or you get no events for
     developers' company payments.
   - Subscribe to `payment.succeeded`.
   - Copy the signing secret → `WHOP_WEBHOOK_SECRET`.
4. Use `sandbox.whop.com` while testing; set `WHOP_API_BASE=https://sandbox-api.whop.com`
   if you want to point at the sandbox REST API.

> The Whop REST calls live in `src/lib/whop/` and are commented with
> `VERIFY AGAINST CURRENT WHOP DOCS`. Confirm endpoint paths / field names and
> the webhook signature header once against the current Whop docs before taking
> real payments — it's a single-file change if anything differs.

## 3. Environment

Copy `.env.local.example` → `.env.local`, fill everything in, and set:

```bash
NEXT_PUBLIC_REAL_BACKEND=true
SINGULARITY_REAL_BACKEND=true
NEXT_PUBLIC_APP_URL=https://<your-domain>
```

Both switches are required — the client-side one alone will not leave demo mode.
Leave either unset to keep running on demo fixtures with no backend.

## How it works once live

- A developer publishes an asset, then clicks **Set up payouts** on the
  dashboard → creates their connected Whop company and runs KYC.
- A buyer purchases a verified variant → redirected to Whop checkout. Whop
  splits the payment: the platform's cut (fee + referral reserve) is taken as
  the application fee, the rest lands in the developer's connected balance.
- The `payment.succeeded` webhook delivers the code (GitHub PR or download) and
  records the sale.
- Developers withdraw via **Manage payouts** (Whop's hosted portal).

The worker (translation + Docker testing) is separate — see the worker section
in `CLAUDE.md` for that deployment.
