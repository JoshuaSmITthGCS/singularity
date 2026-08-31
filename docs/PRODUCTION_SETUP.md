# Production Setup — Step by Step (Sections A & B)

This is the runbook to take Singularity from **demo mode** to a **real, money‑handling
production deployment**. It covers the operational blockers (A) and the payment/
security verification (B) from the prod readiness review.

---

## 🔐 Read this first — secrets never get pasted into chat

There are two kinds of values in this guide:

| Tag | Meaning | Where it goes |
| --- | --- | --- |
| 🟢 **PASTE TO CLAUDE** | Non‑secret identifiers (URLs, IDs, slugs, your domain) and **documentation excerpts**. | Paste these into the chat — Claude needs them to wire config and fix code. |
| 🔴 **SECRET — ENV ONLY** | API keys, private keys, service‑role keys, webhook secrets. | Paste these **only** into your host's environment variables (Netlify / your worker host). **Never** paste them into the chat. |

> If a secret ever lands in chat, treat it as compromised and rotate it.

At the very bottom there's a **PASTE‑BACK TEMPLATE** — fill in only the 🟢 values
and send it back, and Claude will implement the rest.

---

# SECTION A — Operational blockers

## A1. Supabase (database + auth)

**Where to go:** https://supabase.com/dashboard → **New project** (pick a region close
to your users; save the database password somewhere safe).

**What to get:**

1. Project URL and keys — **Settings → API**:
   - Project URL (e.g. `https://abcdxyz.supabase.co`) → 🟢
   - `anon` `public` key → 🔴 (publishable, but still set via env)
   - `service_role` key → 🔴 (full DB access — guard it)
   - Project **ref** (the `abcdxyz` part of the URL, also in Settings → General) → 🟢

2. Apply the 7 migrations to the hosted DB. On your machine:
   ```bash
   # one-time
   npx supabase login
   npx supabase link --project-ref <YOUR_PROJECT_REF>
   # push every migration in supabase/migrations/ to the hosted DB
   npx supabase db push
   ```
   Confirm in **Database → Tables** that you see `assets`, `asset_variants`,
   `asset_tags`, `client_env_configs`, `procurements`, `payments`, `profiles`,
   and the `marketplace_assets` / `marketplace_variants` / `marketplace_search` views.

3. Enable **GitHub login** — **Authentication → Providers → GitHub**:
   - You'll need a GitHub **OAuth App** (separate from the GitHub *App* in A3).
     Create at https://github.com/settings/developers → **New OAuth App**.
   - Authorization callback URL (Supabase gives you this exact value on the
     provider page): `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Put the OAuth App's Client ID + Secret into the Supabase GitHub provider form.

**Env vars produced (set in Netlify, A4):**
```
NEXT_PUBLIC_SUPABASE_URL        🔴/🟢  (URL is not secret, but set via env)
NEXT_PUBLIC_SUPABASE_ANON_KEY   🔴
SUPABASE_SERVICE_ROLE_KEY       🔴
```

**🟢 PASTE TO CLAUDE:** your Project URL and Project ref (so config/docs can reference them).

---

## A2. The translation worker host  ⚠️ THE HARD BLOCKER

The worker is a long‑running Node process that calls Docker to run the 5 language
sandbox images (`worker/src/test-runner.ts` talks to the local Docker socket via
`dockerode`). **Netlify cannot run it** (serverless).

**Decision (made for you): a plain VM with Docker installed, not Fly.io/Railway.**
Those platforms boot each app straight from an OCI image into a microVM with
**no Docker daemon inside** — there's nothing for `dockerode` to talk to, and
they don't support the nested Docker-in-Docker this worker needs. A VM you
control runs Docker natively, which is simpler and actually works.

**Recommended: a DigitalOcean droplet using their "Docker" 1‑click Marketplace
image** (Docker pre-installed, no manual install step):
1. Go to https://cloud.digitalocean.com/droplets/new
2. **Choose an image** → tab **Marketplace** → search **"Docker"** → select
   **Docker on Ubuntu**.
3. **Size**: a `Basic` droplet, `Regular`, **2 GB RAM / 1 vCPU** is enough to start
   (bump to 4 GB if translations queue up).
4. **Region**: closest to your Supabase region (`us-east-1` → pick **New York**).
5. **Authentication**: SSH key (upload yours, or use DigitalOcean's "create new
   key" flow) — password auth works too but SSH keys are safer.
6. **Create Droplet**. Note the public IP it gives you.

Then SSH in (`ssh root@<droplet-ip>`) and run the bootstrap script Claude wrote
(`worker/deploy/setup.sh`) — it installs Node/pnpm if missing (Docker's already
there from the Marketplace image), clones the repo, builds the 5 sandbox
images, and installs a systemd service:
```
curl -fsSL https://raw.githubusercontent.com/JoshuaSmITthGCS/singularity/main/worker/deploy/setup.sh | bash
```
Then edit `/etc/singularity-worker.env` with real secrets and start it:
```
systemctl start singularity-worker
journalctl -u singularity-worker -f   # watch it pick up jobs
```

(Any VM works the same way — EC2, Hetzner, a Lightsail instance — as long as
Docker is installed and you run `worker/deploy/setup.sh`. The DigitalOcean path
above is just the fewest clicks.)

**Env vars** (`worker/deploy/singularity-worker.env.example` has the template,
Supabase URL pre-filled from your project ref):
```
NEXT_PUBLIC_SUPABASE_URL=https://kjzbjsldezkdhtifmeiu.supabase.co   (already filled in)
SUPABASE_SERVICE_ROLE_KEY    (same as A1)   🔴
ANTHROPIC_API_KEY            (from A's Anthropic step below)   🔴
ANTHROPIC_MODEL=claude-opus-4-8   (optional)
WORKER_ID=worker-prod-1
WORKER_POLL_INTERVAL_MS=5000
WORKER_CLAIM_TIMEOUT_MINUTES=10
```

**Anthropic key** — **Where to go:** https://console.anthropic.com/settings/keys →
**Create Key**. → 🔴 ENV ONLY. (And rotate the key that was shared in chat earlier.)

**🟢 PASTE TO CLAUDE:** which worker host you chose (Fly / Railway / VM), and your
production domain if you have it.

---

## A3. GitHub App (repo file reads + PR delivery)

This is **separate** from the OAuth App in A1. The OAuth App logs users in; the
**GitHub App** reads repo files for publishing and opens delivery PRs.

**Where to go:** https://github.com/settings/apps → **New GitHub App**.

**Settings to use:**
- **Homepage URL:** your production URL (e.g. `https://app.yourdomain.com`).
- **Webhook URL:** `https://<YOUR_DOMAIN>/api/webhooks/github`
- **Webhook secret:** generate a random string → 🔴 (also paste into env).
- **Permissions → Repository:**
  - **Contents:** Read and write (needed to push the delivery branch)
  - **Pull requests:** Read and write (needed to open the PR)
  - **Metadata:** Read‑only
- **Where can this be installed:** Any account.

**What to get after creating it:**
- **App ID** → 🟢
- **App slug** (the URL name, e.g. `singularity-delivery`) → 🟢 (used to build install links)
- **Client ID** → 🟢 / **Client secret** (Generate) → 🔴
- **Private key** → **Generate a private key**, download the `.pem`. → 🔴
  (When setting `GITHUB_APP_PRIVATE_KEY`, paste the full PEM including
  `-----BEGIN/END-----`; the code already handles `\n`‑escaped keys.)

**Env vars produced:**
```
GITHUB_APP_ID              🟢-value, set via env
GITHUB_APP_SLUG            🟢
GITHUB_APP_CLIENT_ID       🟢
GITHUB_APP_CLIENT_SECRET   🔴
GITHUB_APP_PRIVATE_KEY     🔴
GITHUB_APP_WEBHOOK_SECRET  🔴
```

**🟢 PASTE TO CLAUDE:** the App ID, App slug, and Client ID (non‑secret — used to
verify install‑URL wiring).

---

## A4. Deploy the frontend/API (Netlify) + flip the switches

**Where to go:** https://app.netlify.com → **Add new site → Import from Git** →
select the `singularity` repo. Build settings come from `netlify.toml` (already in
the repo: build `pnpm build`, publish `.next`).

**Set environment variables** — **Site settings → Environment variables** — paste
every 🔴/🟢 value from A1–A3 plus:
```
NEXT_PUBLIC_APP_URL=https://<YOUR_DOMAIN>
NEXT_PUBLIC_REAL_BACKEND=true
SINGULARITY_REAL_BACKEND=true
```
(Plus all the Whop vars from Section B.)

**Custom domain:** Netlify → **Domain management** → add your domain, follow the DNS
steps. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS URL.

**Verify after deploy:**
```
https://<YOUR_DOMAIN>/api/health   → {"status":"ok"}
https://<YOUR_DOMAIN>/api/ready     → {"status":"ready", ...}
```

**🟢 PASTE TO CLAUDE:** your final production domain (so callback/webhook URLs and
`NEXT_PUBLIC_APP_URL` can be confirmed in code/docs).

---

# SECTION B — Payment & security verification

The Whop integration is **built**, but the code carries explicit "verify against
current Whop docs" markers because field/endpoint/signature names were inferred.
Before taking real money, these must be confirmed. **This is where Claude needs you
to paste documentation excerpts** (not secrets).

## B1. Create the Whop platform company + credentials

**Where to go:** https://whop.com (create your platform/parent company) and the
developer dashboard at https://dev.whop.com (or your company's **Developer/API**
settings).

**What to get:**
- **Company API key** (scopes incl. company/product/plan/checkout/account‑link
  creation, `access_pass:create`) → 🔴 `WHOP_API_KEY`
- **Webhook signing secret** → 🔴 `WHOP_WEBHOOK_SECRET`
- **Platform parent company id** (looks like `biz_...`) → 🟢‑ish `WHOP_PLATFORM_COMPANY_ID`

**Register the webhook** in Whop → point it at:
`https://<YOUR_DOMAIN>/api/webhooks/whop`

**Env vars produced:**
```
WHOP_API_KEY               🔴
WHOP_WEBHOOK_SECRET        🔴
WHOP_PLATFORM_COMPANY_ID   🟢
# WHOP_API_BASE=https://api.whop.com   (only if your account uses a different base)
```

**🟢 PASTE TO CLAUDE:** your `biz_...` platform company id.

## B2. Confirm the webhook signature scheme  ← still needs doc confirmation

**Update:** `src/lib/whop/webhook.ts` now implements the **Standard Webhooks**
scheme (`webhook-id` / `webhook-timestamp` / `webhook-signature` headers,
signing `${id}.${timestamp}.${body}` with HMAC‑SHA256, base64-encoded, secret
formatted `whsec_<base64>`), with replay-window rejection and a legacy bare-HMAC
fallback kept for safety. This was based on two independent web-search results
naming Whop specifically alongside "Standard Webhooks" — this sandbox's network
egress to `whop.com`/`docs.whop.com` is blocked, so it could not be confirmed
directly against the primary docs.

**Before going live:** open your Whop dashboard's webhook docs yourself and
confirm the header names + signing scheme match what's above. 🟢 **PASTE TO
CLAUDE** the exact text if anything differs and it'll be corrected in one place.

## B3. Confirm the REST endpoints + field names  ← needs doc excerpt (unchanged — see note)

Same egress restriction as B2 applied here: search results gave conflicting
signals (one referencing `/api/v1`, another `/api-reference/v2/...`) not
reliable enough to safely rewrite `client.ts` against — a wrong guess here
would fail silently until a real purchase, so this was left exactly as it was
rather than "fixed" on unverified information. Still needs your doc excerpts.

`src/lib/whop/client.ts` uses these calls. Each line is what to confirm in the docs:

| Operation | Path used in code | Fields to confirm |
| --- | --- | --- |
| Create connected company | `POST /api/v2/companies` | `parent_company_id`, returns `id` |
| Onboarding/payout link | `POST /api/v2/account_links` | `company_id`, `use_case` value, returns `url` |
| Company status | `GET /api/v2/companies/:id` | `charges_enabled` / `payouts_enabled` / `kyc_status` / `status` |
| Create product | `POST /api/v2/products` | `company_id`, returns `id` |
| Create one‑time plan | `POST /api/v2/plans` | `company_id`, `plan_type:"one_time"`, `application_fee_amount` (major units), price field, returns `id` |
| Hosted checkout | `POST /api/v2/checkout_sessions` | `plan_id`, `metadata` (must echo back on the webhook), returns `purchase_url`/`checkout_url` |
| Payment‑success webhook | event name | one of `payment.succeeded` / `membership.went_valid`; payload must carry `metadata.procurement_id` |

**Go to Whop's API reference** for "Whop for Platforms / connected accounts,"
"plans," and "checkout sessions." 🟢 **PASTE TO CLAUDE** the request/response shapes
for **company creation**, **plan creation (with the application/platform fee field)**,
and **checkout session creation (with metadata)**. Claude will reconcile
`client.ts` field/endpoint names to the real API.

## B4. End‑to‑end payment test (Whop test mode if available)

After B2/B3 are corrected and deployed:
1. Connect a test developer account (Whop onboarding link).
2. Publish an asset; let the worker verify a variant.
3. Buy it → complete Whop checkout → confirm the `payment.succeeded` webhook hits
   `/api/webhooks/whop`, the procurement flips to delivered, and the PR/download
   is produced.
4. Confirm the **70 / 25 / 5** split lands in `payments` and developer earnings.

## B5. Secrets, RLS, and sandbox hardening

- **Rotate** the Anthropic key shared earlier; ensure all 🔴 values live only in
  host env stores.
- **RLS check:** as an anonymous user, confirm `assets.source_code` / `test_code`
  are **not** readable and that only `marketplace_*` views are public.
- **Sandbox:** test execution is network‑off + read‑only fs but not gVisor‑isolated.
  Acceptable to launch; track as a hardening item.

---

# SECTION C — Optional: Wake-on-LAN utility

`/wol` (and `POST /api/wol`) is a personal utility bolted onto the site, unrelated
to the marketplace product — it lets the admin account send a WOL magic packet to
wake a home PC for live demos. Restricted to `ADMIN_USER_ID`, same gate as `/admin`.

**Requires:** your home router forwarding a UDP port to its local broadcast address
(consult your router's docs — often called "WOL forwarding" or a port forward to
`x.x.x.255`), since a magic packet doesn't route past the LAN on its own.

**Env vars** (set alongside the others in A4, frontend host only — not the worker):
```
WOL_TARGET_HOST=<your home's public IP or DDNS hostname>   🟢-ish (not secret, but env only)
WOL_TARGET_PORT=9                                            (or whatever port you forward)
WOL_TARGET_MAC=AA:BB:CC:DD:EE:FF                              (target PC's MAC address)
```
Leave unset to leave the feature disabled — the route 500s with `MISCONFIGURED` until
all three are set correctly.

**Router setup — TP-Link Archer AX21, target PC running Windows:**

1. **Reserve a static LAN IP for the PC** — Advanced → Network → DHCP Server →
   Address Reservation. Bind its MAC to a fixed IP.
2. **Port forward to the LAN broadcast address** — Advanced → NAT Forwarding →
   Virtual Servers → Add:
   - Service Type: Custom
   - External Port: `9` (must match `WOL_TARGET_PORT`)
   - Internal IP: `192.168.0.255` (your LAN's broadcast address — check the Archer's
     Network Map if your subnet isn't `192.168.0.x`)
   - Internal Port: `9`
   - Protocol: UDP

   If the firmware rejects a `.255` internal IP, forward to the PC's reserved IP
   from step 1 instead — unicast delivery works for WOL in most setups since the
   switch already has that IP/MAC pair bound to a port.
3. **Set up Dynamic DNS** — Advanced → Network → Dynamic DNS (TP-Link's built-in
   DDNS or No-IP) — so `WOL_TARGET_HOST` survives the home IP changing. Use the
   DDNS hostname as `WOL_TARGET_HOST`.
4. **Enable WOL on the Windows PC:**
   - Device Manager → network adapter → Properties → Power Management → check
     "Allow this device to wake the computer."
   - Same dialog, Advanced tab → "Wake on Magic Packet" → Enabled.
   - Control Panel → Power Options → "Choose what the power buttons do" →
     disable **Fast Startup**. Fast Startup hibernates instead of a true
     shutdown on most boards, which blocks WOL from a fully "off" state.
   - Confirm Wake-on-LAN is enabled in BIOS/UEFI (varies by motherboard —
     usually under Power Management, "Resume by PCI-E/PME" or similar).

**Cold boot vs. sleep — what the magic packet actually gets you:**

Waking the worker PC is not one behavior; it's two, depending on the PC's state
when the packet arrives. Get this wrong and you end up writing a custom
startup script to solve a problem that either doesn't exist or needs a
different fix.

- **PC was asleep (not shut down):** the magic packet resumes the exact
  session that was running before sleep. If Docker Desktop and the worker
  (`pm2`, see below) were already running, they're still running the instant
  it wakes — there is nothing to "auto-start." No script needed at all.
- **PC was fully shut down:** the magic packet powers the machine on, but that
  is a *cold boot* — it lands at the Windows lock screen, not a logged-in
  session, unless Windows auto-login is configured for that account. Nothing
  else can run (Docker, the worker, anything) until something signs in.

Getting a cold boot to "just work" for a demo needs three pieces chained
together, none of them a custom script:

1. **Windows auto-login** for the worker account, so a cold boot reaches a
   desktop on its own (`netplwiz` → uncheck "Users must enter a password" for
   that account, or set `DefaultUserName`/`DefaultPassword` in
   `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`).
2. **Docker Desktop → Settings → General → "Start Docker Desktop when you log
   in"** — enabled. The worker can't run `dockerode` against a daemon that
   isn't up yet.
3. **The pm2 setup already in this repo** (`worker/deploy/windows/setup.ps1`
   + `ecosystem.config.js`) — `pm2-windows-startup` already resurrects the
   worker process on login. If that setup has been run once, there's nothing
   left to build; a hand-rolled Task Scheduler + Python/PowerShell script is
   solving a problem this already covers, and adds a second, uncoordinated
   thing trying to start the same worker.

The one thing pm2 can't fix on its own is #1 — it only runs once something
logs in — so auto-login is the piece worth actually verifying if a magic
packet after a full shutdown isn't ending in a running worker.

---

# ✅ PASTE‑BACK TEMPLATE (fill in only the 🟢 values, then send to Claude)

> Do **not** put any 🔴 secret here. Those go straight into Netlify / your worker host.

```
# A1 Supabase
SUPABASE_PROJECT_URL  = https://__________.supabase.co
SUPABASE_PROJECT_REF  = __________

# A2 Worker host
WORKER_HOST           = VM (droplet/EC2/etc — see worker/deploy/setup.sh)
WORKER_HOST_IP        = __________
PRODUCTION_DOMAIN     = https://__________

# A3 GitHub App
GITHUB_APP_ID         = __________
GITHUB_APP_SLUG       = __________
GITHUB_APP_CLIENT_ID  = __________

# B1 Whop
WHOP_PLATFORM_COMPANY_ID = biz___________

# B2 Whop webhook signature (paste the doc excerpt)
  - signature header name:
  - what is signed (raw body? timestamp.body?):
  - encoding (hex / base64):

# B3 Whop API shapes (paste the doc excerpts for):
  - create company:
  - create plan (with platform/application fee field):
  - create checkout session (with metadata):
```

Once you send this back, Claude will: (1) write the worker deploy artifacts for your
chosen host, (2) correct `whop/client.ts` + `whop/webhook.ts` to the real API, (3)
wire `validateEnv()` + expand `/api/ready`, and (4) produce the final env‑var
checklist for Netlify and the worker host.
