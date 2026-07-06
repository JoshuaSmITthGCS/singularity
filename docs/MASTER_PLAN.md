# Singularity — Master Plan: MVP → Fully Operational

> **Audience:** an executing AI agent (Claude Sonnet) working task-by-task, plus
> the founder (Josh) who unblocks the human gates. This plan supersedes
> `docs/ROADMAP.md` as the execution order; `docs/PRODUCTION_SETUP.md` remains
> the ops runbook it references. Grounded in the code as of 2026-07-06
> (branch `claude/mvp-production-roadmap-sdr8ks`, commit `4900b6f`).

---

## 0. Rules for the executing agent

Read these before touching anything. They exist because this codebase has
patterns that break silently if ignored.

1. **One task per branch/PR.** Task IDs (`T1.1`, `T2.3`, …) are the unit of
   work. Never bundle unrelated tasks. Commit style: `feat:`/`fix:`/`docs:`/
   `chore:`/`test:`.
2. **Verification gate for every task:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm --dir worker exec tsc --noEmit && pnpm test
   ```
   A task is not done until this is green. CI (`.github/workflows/ci.yml`)
   runs the same commands in demo mode with no secrets.
3. **Demo branch first.** Every API route and data loader handles
   `isDemoMode()` first, then the real backend. When you add or change a
   route, keep that shape, and add/extend demo fixtures in
   `src/lib/demo-data.ts` so the app still boots with zero services.
4. **Never invent external API shapes.** Tasks marked ⛔ **HUMAN GATE** need
   input only Josh can provide (Whop doc excerpts, hosting choice, secrets,
   dashboard clicks). Do the code scaffolding, then stop and ask with a
   precise request — do not guess field names for Whop, and do not mark the
   task complete.
5. **Secrets never enter the repo or chat.** Env vars go in Netlify / the
   worker host. If a secret appears anywhere, flag it for rotation.
6. **Update docs in the same PR** when behavior changes: `CLAUDE.md` for
   architecture, `README.md` for setup, this file's checkbox for the task.
7. **Style:** TypeScript strict, no semicolons, Server Components by default,
   Tailwind + `src/components/ui` primitives, Zod for all input, response
   envelopes from `src/lib/api.ts`, sparing comments that explain *why* (cite
   TRD § where relevant).

---

## 1. Definition of "fully operational"

The plan is complete when every line below is true:

- [ ] A real user can sign in with GitHub, publish an asset, and watch the
      worker verify it across all 5 languages on a production host.
- [ ] A real buyer can pay through Whop checkout, the webhook delivers a PR or
      download, and the 70/25/5 split lands in `payments` + developer earnings.
- [ ] A developer can complete Whop KYC and withdraw a payout.
- [ ] Every public endpoint is rate-limited, size-capped, and RLS-verified;
      the sandbox drops capabilities and caps pids.
- [ ] Errors reach an alerting channel (Sentry) before users report them;
      `/api/ready` reflects the true config state of all integrations.
- [ ] Search filters work in the UI; assets carry LLM-enriched tags; buyers
      can set their target environment.
- [ ] Marketplace pages show test evidence (counts, adaptation log) and buyer
      reviews; buyers get email receipts/delivery notices.
- [ ] Unit economics are positive: per-asset verification cost is tracked and
      the pricing model covers it with margin.
- [ ] The site looks intentional: consistent 5-language messaging, real
      OG/SEO metadata, polished empty/loading/error states.

---

## 2. Milestone map and order

```
M0 Hygiene ──► M1 Ship blockers ──► M2 Security ──► M3 Reliability
   (repo)        (⛔ gates)            hardening        & observability
                     │
                     ▼
              M4 Product completion ──► M5 Trust & conversion ──► M6 Design polish
                     │
                     ▼
              M7 Profitability engine        M8 Scale (deferred until volume)
```

Recommended sequence: **M0 → M1 → M2 → M3 → M4 → M7 → M5 → M6**, with M7's
pricing task (T7.1) pulled forward before real money flows — it changes what
buyers are charged and should ship before launch marketing. M8 is explicitly
deferred; do not start it without a metrics-based trigger (see §M8).

Everything in M0, M2, M3, M4, M5, M6 and most of M7 is fully
Sonnet-executable with no human input. M1 contains all the ⛔ gates.

---

## M0 — Repo hygiene (½ day, no gates)

### T0.1 Move the `Data room/` out of the application repo
- **Why:** `Data room/` contains cap-table CSVs, investor memos, entity docs.
  It is business-sensitive, irrelevant to the app, and will ship to anyone the
  repo is shared with (contractors, auditors, open-source future).
- **Files:** `Data room/**` (46 files)
- **Steps:** ⛔ **HUMAN GATE (decision only):** confirm with Josh where it
  goes (separate private repo or local archive). Then `git rm -r 'Data room'`,
  add `Data room/` to `.gitignore`, and note in the PR that git history still
  contains it (full scrub needs `git filter-repo` + force push — offer as a
  follow-up Josh must approve).
- **Accept:** repo contains only product code + docs; CI green.

### T0.2 Fix stale landing-page copy (3 languages → 5)
- **Files:** `src/app/page.tsx`
- **Steps:** the hero and "Publish" step still say "TypeScript, JavaScript,
  or Java". Update all copy to the real matrix (TS/JS/Java/C#/C++) and the
  game-dev positioning ("Unity, Unreal, Godot, libGDX, Phaser" beats
  "indie scripting"). Pull language names from `LANGUAGE_LABEL` in
  `src/lib/constants.ts` instead of hardcoding where practical.
- **Accept:** no page mentions a 3-language matrix; `pnpm build` succeeds.

### T0.3 Archive superseded docs
- **Files:** `docs/ROADMAP.md`
- **Steps:** add a banner at the top: "Superseded by MASTER_PLAN.md; kept for
  the phase-level detail it contains." Do not delete it — its Phase 1–3
  implementation notes are referenced below.
- **Accept:** a newcomer reading `docs/` knows which file is authoritative.

---

## M1 — Ship blockers (1–2 weeks elapsed; mostly waiting on gates)

This is the only milestone standing between "demo" and "money". Work the
code-side tasks immediately; park the ⛔ gates in a single tracking issue so
Josh can batch them. `docs/PRODUCTION_SETUP.md` is the click-by-click runbook
for the gates — this section only lists what code must change.

### T1.1 Worker deploy artifacts (code now, host choice is a gate)
- **Why:** the worker is a long-running Docker-controlling process; Netlify
  can't host it. Nothing can be verified in production until this exists.
- **Files (new):** `worker/Dockerfile`, `worker/fly.toml` (or equivalent),
  `worker/DEPLOY.md`
- **Steps:**
  1. ⛔ **HUMAN GATE:** Josh picks the host (recommend **Fly.io**: cheap,
     Docker-native, persistent machines). Default to Fly if he has no
     preference; the artifacts below assume it.
  2. Write `worker/Dockerfile`: multi-stage Node 20 build (`pnpm install`,
     `tsc`), final image runs `node dist/index.js`. The worker needs access
     to a Docker daemon to launch the 5 sandbox images — on Fly use a
     dedicated machine with the Docker socket via `fly.toml` `[experimental]`
     or run dockerd-in-VM (document the chosen approach in `worker/DEPLOY.md`
     with the exact `fly launch`/`fly deploy` commands).
  3. Add a build step that builds the 5 sandbox images
     (`worker/docker/*.Dockerfile`) on the host at deploy time
     (`pnpm --dir worker build:images` equivalent as a release command).
  4. Add process resilience: the loop in `worker/src/index.ts` already
     catches per-job errors; add a top-level restart-on-crash (host-level
     `restart = "always"` is fine, note it in DEPLOY.md).
- **Accept:** `docker build -f worker/Dockerfile .` succeeds locally; DEPLOY.md
  contains a copy-pasteable deploy sequence; env vars documented match
  `worker/src/config.ts`.

### T1.2 ⛔ Whop API verification (the money gate)
- **Why:** `src/lib/whop/client.ts`, `src/lib/whop/webhook.ts`, and
  `src/lib/whop/config.ts` carry explicit `VERIFY AGAINST CURRENT WHOP DOCS`
  markers. Endpoint paths, field names, the fee field, and the signature
  scheme were inferred, not confirmed. **Real payments must not be enabled
  before this task.**
- **Files:** `src/lib/whop/client.ts`, `src/lib/whop/webhook.ts`,
  `src/lib/whop/config.ts`
- **Steps:**
  1. ⛔ **HUMAN GATE:** Josh pastes the doc excerpts listed in
     `docs/PRODUCTION_SETUP.md` §B2–B3 (signature header + signing scheme +
     encoding; request/response shapes for company / account-link / product /
     plan-with-application-fee / checkout-session; the payment-success event
     name and metadata echo).
  2. Reconcile `client.ts` and `webhook.ts` exactly to the excerpts. If the
     signature scheme is timestamped (Stripe-style `t=...,v1=...`), add a
     ±5-minute replay window and constant-time comparison (the current
     verifier already uses `timingSafeEqual`; keep that).
  2b. **Confirm who bears Whop's payment-processing fee** (platform vs the
     developer's connected company). This decides Scenario A vs B in
     `docs/PRICING.md` §4 — if the platform bears it, raise
     `PRICE_FLOOR_CENTS` to 500–600 or compute the split net of processing,
     otherwise the $4-floor sale drops below the 70% gross-margin red line.
  3. Add unit tests with fixture payloads for the confirmed signature scheme
     (`src/lib/whop/webhook.test.ts`).
- **Accept:** zero `VERIFY` markers remain in `src/lib/whop/`; webhook tests
  pass; a Whop test-mode checkout completes end-to-end (§B4 of the runbook).

### T1.3 Webhook fulfillment race + idempotency guard
- **Why:** `src/app/api/webhooks/whop/route.ts` checks
  `status === "delivered"` then fulfills — two concurrent retries of the same
  event can both pass the check and double-deliver (duplicate PRs, duplicate
  earnings updates).
- **Files:** `src/app/api/webhooks/whop/route.ts`, new migration in
  `supabase/migrations/`
- **Steps:**
  1. Make the `awaiting_payment/paid → delivering` transition atomic: a
     conditional update
     (`update ... set status='delivering' where id=? and status in ('awaiting_payment','paid') returning *`)
     via a Postgres function or a guarded Supabase update that inspects the
     returned row count. Only the caller that wins the transition runs
     `fulfillProcurement`.
  2. Record `whop_payment_id` uniqueness: unique partial index on
     `procurements(whop_payment_id)` where not null, so a replayed event with
     the same payment id can't attach twice.
  3. Wrap `fulfillProcurement` failures: on error set `status='paid',
     failure_reason=...` (payment kept, delivery retryable) rather than
     leaving `delivering` stuck; add a `GET` retry path in T3.3.
- **Accept:** unit test simulating two concurrent webhook calls results in
  exactly one delivery; migration applies cleanly on `supabase db reset`.

### T1.4 Real `/api/ready` + startup env validation
- **Why:** `src/lib/env-validation.ts` checks 2 of ~15 required vars;
  `/api/ready` only reports Supabase. In production a missing
  `GITHUB_APP_PRIVATE_KEY` currently surfaces as a 500 mid-purchase.
- **Files:** `src/lib/env-validation.ts`, `src/app/api/ready/route.ts`,
  `worker/src/config.ts`
- **Steps:**
  1. Replace `validateEnv` with a Zod schema over all real-backend vars
     (Supabase ×3, GitHub App ×6, Whop ×3, `NEXT_PUBLIC_APP_URL`, backend
     flags). In demo mode everything is optional.
  2. `/api/ready` returns per-integration checks:
     `{ supabase, github_app, whop, app_url }` each `"ok" | "missing" |
     "demo"`; 503 unless all ok (or demo). **Do not echo values** — names and
     status only.
  3. Worker: `worker/src/config.ts` should fail fast on boot with a named
     list of missing vars (it may already partially — bring to parity).
- **Accept:** with a var deleted locally, `/api/ready` 503s and names the
  integration (not the value); tests cover the schema.

### T1.5 Rate limiting + request caps on all public routes
- **Why:** there is **no rate limiting anywhere**. `/api/assets` accepts
  160 KB bodies and triggers 4 LLM translation jobs per call — an attacker
  can drain the Anthropic budget with a loop. This is both a security and a
  unit-economics hole.
- **Files (new):** `src/lib/rate-limit.ts`; touched: every route under
  `src/app/api/**` except health/ready
- **Steps:**
  1. Implement a small fixed-window limiter keyed on user id (authed) or IP
     (`x-forwarded-for` first hop) backed by a Postgres table
     (`rate_limit_buckets`) via the admin client — no new infra. Include a
     demo-mode in-memory fallback. Design the interface so an Upstash/Redis
     backend can replace it later without touching routes.
  2. Budgets (constants in `src/lib/constants.ts`): asset creation **5/hour
     per user**, procurement creation **20/hour**, search **60/min per IP**,
     GitHub/Whop connect endpoints **10/hour**, webhooks exempt (they're
     signature-gated).
  3. Return 429 with the standard error envelope + `Retry-After`.
  4. Add per-user concurrent-verification cap: reject `POST /api/assets` if
     the user already has ≥ 3 assets in `verifying` (checked in the route).
- **Accept:** unit tests for the limiter; hammering `/api/assets` in demo
  mode returns 429 after the budget; CI green.

### T1.6 ⛔ Production environment bring-up (pure runbook execution)
- **Steps:** Josh executes `docs/PRODUCTION_SETUP.md` §A1 (Supabase +
  migrations + GitHub OAuth), §A3 (GitHub App), §A4 (Netlify + env + domain),
  §B1 (Whop company + webhook registration), then §B4 (end-to-end test-mode
  purchase) and §B5 (RLS spot-check, key rotation).
- **Agent's part:** when Josh pastes the 🟢 values (project ref, app id, slug,
  client id, `biz_...` id, domain), update any config/docs that reference
  placeholders, and confirm callback/webhook URLs in code match the domain.
- **Accept:** `https://<domain>/api/health` → ok, `/api/ready` → ready, one
  test purchase delivered, §1 checkboxes 1–3 true.

---

## M2 — Security hardening (3–4 days, no gates)

### T2.1 Sandbox lockdown
- **Why:** `worker/src/test-runner.ts` sets memory/CPU caps, non-root user,
  network-off test stage — good — but containers can still fork-bomb, gain
  file capabilities, and the install stage has open egress.
- **Files:** `worker/src/test-runner.ts`, `worker/docker/*.Dockerfile`
- **Steps:** add to `HostConfig` for both stages:
  `PidsLimit: 256`, `CapDrop: ["ALL"]`, `SecurityOpt:
  ["no-new-privileges"]`, `Ulimits` (nofile 1024, fsize ~64 MB), and
  `Tmpfs: { "/tmp": "rw,size=64m" }`. Keep install-stage `bridge` network
  (package registries need it) but document it as the residual risk; test
  stage stays `none`. Bump install timeout handling to also kill on memory
  OOM cleanly (Docker does this; just surface "OOMKilled" in output by
  checking `container.wait()` result / inspect).
- **Accept:** all 5 language images still pass a known-good asset locally
  (run the worker against the demo seed asset); a `while(true) fork` test
  case is killed by PidsLimit, not the host.

### T2.2 Security headers + hardened Next config
- **Files:** `next.config.ts`, `middleware.ts`
- **Steps:** add headers (via `next.config.ts` `headers()`):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera/mic/geolocation off), and a
  Content-Security-Policy that allows self + Supabase + Whop checkout domains
  only (start in `report-only`, flip to enforce after a week clean).
- **Accept:** `curl -sI` on any page shows the headers; app functions in dev.

### T2.3 RLS verification script
- **Why:** the privacy model ("code visible only to developer, buyer,
  service role") is enforced by SQL policies nobody currently exercises.
- **Files (new):** `scripts/verify-rls.ts`
- **Steps:** a `tsx` script that connects with the **anon** key and asserts:
  `assets.source_code`/`test_code` unreadable, `asset_variants.translated_code`
  unreadable, `marketplace_*` views readable, `client_env_configs` /
  `procurements` / `payments` unreadable, writes rejected. Exit non-zero on
  any leak. Document running it against staging/prod after every migration.
- **Accept:** script passes against a local `supabase start` + `db reset`;
  wired into CI as an optional job that runs when Supabase credentials are
  present (skip in demo CI).

### T2.4 Dependency + secret scanning in CI
- **Files:** `.github/workflows/ci.yml`
- **Steps:** add `pnpm audit --prod --audit-level high` (non-blocking warn at
  first, blocking after triage) and a `gitleaks` action for secret scanning.
- **Accept:** CI shows both jobs; no findings, or findings triaged in the PR.

### T2.5 LLM-output injection review
- **Why:** translated code and `notes_for_pr` are LLM output rendered into
  GitHub PR bodies and the procurement page. Hostile asset code could steer
  the translator into emitting markdown/HTML that misleads buyers.
- **Files:** `src/lib/procurements/delivery.ts`,
  `src/app/procurements/[procurementId]/page.tsx`
- **Steps:** render code strictly inside fenced blocks / `<pre>` (escape
  backtick-escapes in PR bodies by fencing with `~~~` + a randomized fence if
  content contains fences); never `dangerouslySetInnerHTML` LLM text; cap
  `notes_for_pr` length. Add a short "AI-translated, verify before use"
  disclaimer to PR bodies.
- **Accept:** an asset whose code contains ```` ``` ```` and HTML renders
  inert on the procurement page and in a PR body fixture test.

---

## M3 — Reliability & observability (3–4 days, one tiny gate)

### T3.1 Error tracking + structured logs
- **Files:** `src/app/error.tsx`, new `src/lib/logger.ts`,
  `worker/src/logger.ts`, instrumentation per Next.js `instrumentation.ts`
- **Steps:**
  1. ⛔ **HUMAN GATE (5 min):** Josh creates a free Sentry project, sets
     `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` in Netlify + worker host.
  2. Add `@sentry/nextjs` (app) and `@sentry/node` (worker); capture route
     errors, webhook failures, worker job failures with variant/asset ids as
     tags (never code contents).
  3. Replace bare `console.log/error` in the worker with a tiny JSON logger
     (`{ ts, level, worker_id, variant_id, msg }`) so host log search works.
- **Accept:** a thrown test error appears in Sentry from both app and worker;
  demo mode works with no DSN set.

### T3.2 Worker retries, backoff, and dead-lettering
- **Why:** today any error (transient Anthropic 529, Docker hiccup) marks the
  variant `failed` forever; buyers see a red badge for what was a blip.
- **Files:** `worker/src/index.ts`, `worker/src/claim.ts`, migration adding
  `asset_variants.attempts int default 0` and `last_error text`
- **Steps:** on failure, increment `attempts`; if `attempts < 3` and the
  error is transient (network/5xx/timeout — classify by error type), reset to
  `queued` with exponential delay (set `claimed_at` null + a `not_before`
  timestamp the claim query respects). After 3 attempts → `failed` with
  `last_error`. Translation-refusal or test-failure results are *not*
  retried (they're deterministic outcomes, not errors).
- **Accept:** unit test on the classification + claim query respects
  `not_before`; migration applies cleanly.

### T3.3 Stuck-procurement recovery
- **Files:** `src/app/api/procurements/[id]/route.ts` (new), procurement page
- **Steps:** add `POST /api/procurements/:id/retry-delivery` (buyer-only,
  RLS-checked) that re-runs `fulfillProcurement` when status is `paid` with a
  `failure_reason` — the safe retry path for T1.3's failure mode. Surface a
  "Retry delivery" button on the procurement page in that state.
- **Accept:** demo-mode test covers the endpoint; double-click can't
  double-deliver (uses T1.3's atomic transition).

### T3.4 Uptime + queue-depth monitoring
- **Files:** `src/app/api/health/route.ts` (extend), `docs/PRODUCTION_SETUP.md`
- **Steps:** extend health to include `queue: { queued, testing, oldest_queued_minutes }`
  from a cheap count query (admin client; demo returns zeros). Document
  pointing a free pinger (UptimeRobot) at `/api/health` and alerting when
  `oldest_queued_minutes > 30` (worker down) — that check can be a Netlify
  scheduled function or the pinger's keyword match.
- **Accept:** health returns queue stats in real mode; runbook updated.

---

## M4 — Product completion (1–1.5 weeks, no gates)

These close the gap between "what the TRD promises" and "what the UI does".
Implementation detail for all three lives in `docs/ROADMAP.md` Phases 1–3 —
follow those file-level notes; this section fixes the order and adds
acceptance criteria.

### T4.1 Wire structured search into the marketplace UI
- **Files:** `src/components/MarketplaceSearch.tsx`,
  `src/app/marketplace/page.tsx`
- **Steps:** per ROADMAP Phase 2 — facet controls (genre via `GENRE_GROUPS`,
  purpose, engine, complexity, language) as a client component; call
  `GET /api/search` on change; render `results` then the `expanded` fallback
  under its `expanded_label`; reflect state in the URL with `useSearchParams`
  so searches are shareable; default listing stays `getMarketplaceAssets()`.
- **Accept:** filter by engine narrows the grid in demo mode; URL round-trips
  (paste a filtered URL → same results); empty state shows the expanded set.

### T4.2 LLM auto-tagging (`llm_v1`) in the worker
- **Files:** new `worker/src/tagger.ts`, `worker/src/index.ts`, mirror of the
  taxonomy vocabulary into `worker/src/taxonomy.ts`
- **Steps:** per ROADMAP Phase 1 — after the source-language variant passes,
  one structured-output Claude call (same Zod pattern as
  `worker/src/translator.ts`, **use the cheaper model tier — see T7.2**)
  produces tags + per-field confidence; insert `asset_tags` with
  `version = max+1, source='llm_v1'`; precedence rule: developer-provided
  fields win, LLM fills only empty fields (implement in the tagger by reading
  v1 first).
- **Accept:** publishing in a real-backend integration test yields both tag
  rows; `/api/search` matches on an LLM-added engine tag; tagging cost is
  logged (tokens in/out) per T7.3.

### T4.3 Buyer environment settings page
- **Files:** new `src/app/settings/page.tsx`, small form component
- **Steps:** per ROADMAP Phase 3 step 1 only — a settings page backed by the
  existing `GET/PUT /api/client/env-config` (primary/secondary languages,
  target engine, unit system, naming convention, default repo/branch,
  pr_mode). Link from `SiteHeader` and from `PurchaseForm` ("set your
  defaults"). Prefill `PurchaseForm` repo/branch from the config.
- **Accept:** demo mode saves/loads the config; purchase form prefills.
- **Note:** the per-buyer re-adaptation pass (ROADMAP Phase 3 steps 2–3) is
  **deliberately deferred to M8** — it multiplies LLM cost per sale and needs
  the cost tracking from T7.3 first.

### T4.4 Publish-flow status visibility
- **Why:** after publishing, the developer has no live view of verification.
- **Files:** `src/app/dashboard/page.tsx`, maybe a small
  `src/app/api/assets/[id]/route.ts` extension
- **Steps:** dashboard asset cards show per-language variant status chips
  (already have `LanguageBadge`) with test counts and, on failure, the first
  lines of `test_output` behind a disclosure. Poll every 10 s while any
  variant is `queued/testing` (client component with `setInterval`, stop when
  terminal).
- **Accept:** in demo mode, statuses render; polling stops at terminal state.

---

## M5 — Trust & conversion (1 week, one tiny gate)

### T5.1 Test-evidence transparency on the asset page
- **Why:** "verified translation" is the differentiator — show the receipts.
- **Files:** `src/app/marketplace/[assetId]/page.tsx`, marketplace views
  migration if needed
- **Steps:** per passed variant show tests passed/total, verification date,
  and the `adaptation_log` (what was changed for that language/engine) in a
  disclosure. Expose via `marketplace_variants` view (add columns if the view
  omits them — check `20260101000001_rls_policies.sql`); never expose code.
- **Accept:** asset detail shows counts + log in demo mode; RLS script
  (T2.3) still passes.

### T5.2 Ratings & reviews
- **Files:** new migration (`reviews` table + RLS: only a buyer with a
  `delivered` procurement for that asset may insert, one per buyer per
  asset), `src/app/api/assets/[id]/reviews/route.ts`, components, aggregate
  on `marketplace_assets` view
- **Steps:** 1–5 stars + ≤ 1000-char body; show average + count on
  `AssetCard` and the detail page; factor rating into search ordering
  (secondary sort in `lib/marketplace/search.ts`). Demo fixtures included.
- **Accept:** RLS blocks non-buyers (extend T2.3 script); demo mode shows
  seeded reviews; CI green.

### T5.3 Transactional email
- **Files:** new `src/lib/email.ts`, hooks in webhook + fulfillment paths
- **Steps:** ⛔ **HUMAN GATE (10 min):** Josh creates a Resend account +
  domain, sets `RESEND_API_KEY`. Implement three emails: purchase receipt
  (buyer), delivery-complete with PR link (buyer), sale notification with
  earnings (developer). Plain, branded, no tracking pixels. No-op silently in
  demo mode / when key missing.
- **Accept:** emails render from React Email or plain HTML templates; unit
  test snapshots; real send verified once in staging.

### T5.4 Developer analytics on the dashboard
- **Files:** `src/app/dashboard/page.tsx`, one query in
  `src/lib/marketplace/queries.ts` or a new `lib/dashboard/queries.ts`
- **Steps:** per-asset sales count, revenue, and a 30-day sparkline from
  `procurements` (delivered only). Pure SQL aggregate; demo fixtures.
- **Accept:** dashboard shows earnings that reconcile with `payments` rows.

---

## M6 — Design & brand polish (3–5 days, no gates)

### T6.1 SEO/meta/OG layer
- **Files:** `src/app/layout.tsx`, per-page `generateMetadata`, new
  `src/app/sitemap.ts`, `src/app/robots.ts`, static OG image in `public/`
- **Steps:** real `<title>`/description per route; `generateMetadata` on
  asset detail pages (title, short_description); sitemap listing marketplace
  + published asset pages; robots allowing all but `/api`, `/dashboard`,
  `/procurements`, `/settings`; one designed OG image (dark, language badges,
  "AI-verified game code").
- **Accept:** `curl` shows correct meta on landing + one asset page;
  `/sitemap.xml` and `/robots.txt` valid.

### T6.2 State polish: loading, empty, error
- **Files:** `src/app/**/loading.tsx` (marketplace, dashboard, procurements),
  empty states in grid/dashboard/procurements, `src/app/not-found.tsx`
- **Steps:** skeleton cards matching `AssetCard` dimensions; empty states
  with a single clear CTA ("Publish your first asset"); friendly 404. Reuse
  existing panel/border tokens — no new design language.
- **Accept:** throttled navigation shows skeletons, not layout shift; empty
  demo filters show the CTA, not a blank grid.

### T6.3 Accessibility + responsive pass
- **Files:** components under `src/components/`
- **Steps:** keyboard-navigate publish wizard and purchase form (focus order,
  visible focus rings); `aria-label` on icon-only buttons; verify color
  contrast of the status badge palette (`LanguageBadge`) against WCAG AA;
  check marketplace grid + publish form at 360 px width.
- **Accept:** axe (`@axe-core/cli` or manual devtools scan) reports no
  critical issues on landing, marketplace, asset detail, publish.

### T6.4 Consistent voice + microcopy
- **Files:** all user-facing strings
- **Steps:** one sweep: sentence-case headings, consistent terms (always
  "asset", "variant", "verified" — never mix "procurement"/"purchase" in UI:
  buyers see "purchases"), error messages that say what to do next. Keep the
  existing dark/terminal aesthetic — it fits the audience; make it deliberate
  rather than default.
- **Accept:** a read-through of every page finds no term drift; ESLint clean.

---

## M7 — Profitability engine (1 week; pull T7.1 before launch)

> **Status 2026-07-06:** T7.1, T7.2, and T7.3 are ✅ **implemented**, plus an
> unplanned lever — **on-demand translation** (publish verifies only the
> source language; targets translate when requested via
> `POST /api/assets/[id]/variants`, toggle `SINGULARITY_TRANSLATION_MODE`).
> Full economics: `docs/PRICING.md`. Remaining in M7: T7.4 referrals, T7.5
> analytics, T7.7 Publisher Pro tier.
>
> **Margin policy:** parameters are tuned to a **75–85% gross margin** on
> platform revenue (SaaS benchmark; < 70% = underpriced or inefficient) with
> a long-run **15–25% net margin** target evaluated via the Rule of 40. The
> math, token estimates, and the fee-bearer decision rule live in
> `docs/PRICING.md` §§3–5 — re-baseline from the per-variant cost columns
> after the first weeks of real traffic.

The v1 formula capped prices at **$3.50** (`0.50 × 5.0 + 5 × 0.20`) and the
platform kept 25% + 5% ≈ **$1.05 max per sale**, while verifying one asset
cost 4 Claude Opus translation calls + 5 Docker runs. At plausible token
volumes that was **negative margin until an asset sold several copies**.

### T7.1 Reprice: raise the curve, add a floor, keep the formula
- **Files:** `src/lib/pricing.ts`, `worker/src/pricing.ts` (keep mirrored),
  `src/lib/constants.ts`, tests
- **Steps:**
  1. New parameters (constants, single source): base **$4.00**, multipliers
     low/med/high = **1.0 / 2.5 / 5.0** (unchanged), quality bonus
     **$1.00/point** (0–5). Range becomes **$4–$25** — believable for
     verified, multi-engine game systems (comps: Unity Asset Store scripts
     $5–$40).
  2. Add `PRICE_FLOOR_CENTS = 400`.
  3. Update both mirrors + all tests + the live estimate in `PublishForm`.
  4. Document the rationale in a short `docs/PRICING.md` (formula, comps,
     margin math) so future changes are deliberate.
- **Accept:** `pnpm test` green with new expectations; publish form shows new
  estimates; INVESTOR.md figures updated if they cite prices.

### T7.2 Model tiering for translation
- **Why:** Opus for every translation is the biggest marginal cost.
- **Files:** `worker/src/translator.ts`, `worker/src/config.ts`
- **Steps:** default `ANTHROPIC_MODEL` to **`claude-sonnet-5`** for
  translation; add `ANTHROPIC_MODEL_ESCALATION` (default `claude-opus-4-8`):
  if the Sonnet translation fails tests, retry **once** with the escalation
  model before marking failed (hook into T3.2's retry classification — an
  "escalate" retry, not a transient retry). Tagging (T4.2) always uses the
  cheap tier. Keep prompt caching as-is.
- **Accept:** config test covers the fallback ladder; a forced-failure test
  path exercises escalation; docs/PRICING.md notes expected cost per asset.

### T7.3 Cost tracking per asset
- **Files:** migration adding `asset_variants.tokens_input bigint`,
  `tokens_output bigint`, `model text`; `worker/src/translator.ts` (usage is
  on every Messages API response), dashboard admin view later
- **Steps:** persist usage per translation/tagging call; add a
  `verification_cost_cents` computed estimate on the asset (sum of variant
  costs at current per-token rates, rates as worker constants). Surface total
  spend vs. revenue in the dashboard for the platform operator (simple
  query documented in docs/PRICING.md until an admin page exists).
- **Accept:** after a worker run, variants carry token counts; the margin
  query returns per-asset profitability.

### T7.4 Referral program (spend the 5% that's already reserved)
- **Files:** migration (`referrals` table: code, owner, uses; procurement
  gets `referral_code`), `src/app/api/procurements/route.ts`,
  `PurchaseForm`, dashboard
- **Steps:** every profile gets a code; checkout accepts one; on a delivered
  referred sale, credit `referral_reserve_cents` to the referrer's earnings
  (self-referral blocked). Unused reserve stays platform revenue. Share
  widget on the dashboard ("earn 5% of sales you refer").
- **Accept:** referred demo purchase credits the referrer; split still sums
  to 100% (extend pricing tests).

### T7.7 Publisher Pro tier (tiered packaging)
- **Why:** the marketplace take is usage-based pricing (scales with buyer
  success); a subscription tier captures the high-willingness-to-pay seller
  segment without raising buyer prices.
- **Files:** new migration (`profiles.pro_until timestamptz`), Whop
  subscription product, publish route (eager mode for Pro), worker claim
  ordering (Pro assets first), dashboard analytics gating
- **Steps:** ~$19/mo via a Whop subscription plan on the platform company:
  eager translation to all five languages at publish, priority verification
  queue, sales analytics (T5.4 becomes the free teaser, Pro gets full
  history). Build only after T5.4 and T7.5 exist — the tier needs something
  to sell.
- **Accept:** a Pro publisher's asset queues all languages at publish and
  claims ahead of free assets; subscription state syncs from a Whop webhook.

### T7.5 Product analytics funnel
- **Files:** `src/app/layout.tsx` + a tiny wrapper `src/lib/analytics.ts`
- **Steps:** ⛔ **HUMAN GATE (5 min):** Josh picks Plausible (simple, no
  cookie banner) or PostHog (funnels); create project, set the env var.
  Instrument: landing → marketplace view → asset view → checkout started →
  purchase delivered; publish started → published. No-op in demo/missing-key.
- **Accept:** events visible in the dashboard from a staging click-through.

---

## M8 — Scale triggers (do not build yet)

Build each item **only when its trigger fires**; record the decision in this
file when it does.

| Deferred item | Build when… |
| --- | --- |
| Per-buyer re-adaptation at purchase (ROADMAP Phase 3.2–3.3) | ≥ 20 sales/month AND T7.3 shows margin absorbs a per-sale LLM pass |
| gVisor (`runsc`) sandbox runtime | first hostile-code incident, or > 100 verifications/day |
| ElasticSearch + semantic re-rank | > 500 published assets or search-abandonment evidence |
| Worker fleet / queue service (replace `FOR UPDATE SKIP LOCKED`) | sustained queue depth > 50 or verification latency > 30 min |
| On-chain provenance (anchors already in schema) | a partner/customer explicitly requires it |
| Kubernetes / service split | never, until two of the above are live |

---

## Task index

| ID | Milestone | Task | Gate | Est. |
| --- | --- | --- | --- | --- |
| T0.1 | M0 | Data room out of repo | ⛔ decision | 1 h |
| T0.2 | M0 | Landing copy → 5 languages ✅ done | — | 1 h |
| T0.3 | M0 | Doc supersession banner | — | 15 m |
| T1.1 | M1 | Worker deploy artifacts | ⛔ host choice | 1 d |
| T1.2 | M1 | Whop API verification | ⛔ doc excerpts | 1 d |
| T1.3 | M1 | Webhook race/idempotency | — | ½ d |
| T1.4 | M1 | Ready probe + env validation | — | ½ d |
| T1.5 | M1 | Rate limiting + caps | — | 1 d |
| T1.6 | M1 | Prod bring-up | ⛔ runbook | 1–2 d |
| T2.1 | M2 | Sandbox lockdown | — | ½ d |
| T2.2 | M2 | Security headers/CSP | — | ½ d |
| T2.3 | M2 | RLS verification script | — | ½ d |
| T2.4 | M2 | Dep + secret scanning CI | — | 2 h |
| T2.5 | M2 | LLM-output injection review | — | ½ d |
| T3.1 | M3 | Sentry + structured logs | ⛔ 5 min | ½ d |
| T3.2 | M3 | Worker retries/backoff | — | 1 d |
| T3.3 | M3 | Stuck-procurement recovery | — | ½ d |
| T3.4 | M3 | Uptime + queue monitoring | — | ½ d |
| T4.1 | M4 | Search UI wiring | — | 1 d |
| T4.2 | M4 | LLM auto-tagging | — | 1 d |
| T4.3 | M4 | Buyer settings page | — | 1 d |
| T4.4 | M4 | Publish status visibility | — | ½ d |
| T5.1 | M5 | Test-evidence transparency | — | ½ d |
| T5.2 | M5 | Ratings & reviews | — | 1–2 d |
| T5.3 | M5 | Transactional email | ⛔ 10 min | 1 d |
| T5.4 | M5 | Developer analytics | — | ½ d |
| T6.1 | M6 | SEO/meta/OG | — | 1 d |
| T6.2 | M6 | Loading/empty/error states | — | 1 d |
| T6.3 | M6 | Accessibility pass | — | 1 d |
| T6.4 | M6 | Voice + microcopy sweep | — | ½ d |
| T7.1 | M7 | Repricing + floor ✅ done | — | ½ d |
| T7.2 | M7 | Model tiering ✅ done | — | ½ d |
| T7.3 | M7 | Cost tracking ✅ done | — | 1 d |
| T7.6 | M7 | On-demand translation ✅ done | — | 1 d |
| T7.7 | M7 | Publisher Pro tier | — | 2 d |
| T7.4 | M7 | Referral program | — | 1–2 d |
| T7.5 | M7 | Analytics funnel | ⛔ 5 min | ½ d |

**Total agent effort:** ~5–6 working weeks of implementation, parallelizable
by milestone. **Total human effort:** roughly one afternoon of account
creation + doc pasting (batched in M1) plus the T0.1 decision.

---

## Appendix A — Manual go-live checklist (everything done by hand)

Every account, website, key, and string that must exist before the platform
is functional with real money. This is human-only work — the agent can't
create accounts for you. Do the steps **in order**; each produces values the
next step consumes. Click-by-click detail for steps 1–6 is in
`docs/PRODUCTION_SETUP.md`; this is the complete inventory.

**Two rules:**
- 🔴 **Secret** values go ONLY into env-var stores (Netlify UI / `fly
  secrets`). Never paste them into chat, commits, or files in this repo. If
  one leaks, rotate it.
- 🟢 **Non-secret** identifiers (IDs, slugs, URLs) can be pasted to the agent
  so it can wire config and docs.

### Step 1 — Supabase (database + auth) · https://supabase.com/dashboard
1. Create a project (pick a region near your users; save the DB password in
   a password manager).
2. **Settings → API**, collect:
   - Project URL 🟢 → `NEXT_PUBLIC_SUPABASE_URL`
   - Project ref 🟢 (the `abcdxyz` part of the URL)
   - `anon public` key 🔴 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key 🔴 → `SUPABASE_SERVICE_ROLE_KEY`
3. Push the schema from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push        # applies all 8 migrations
   ```
   Verify in **Database → Tables**: `assets`, `asset_variants` (with the
   `translation_cost_cents` column), `asset_tags`, `client_env_configs`,
   `procurements`, `payments`, `profiles`, plus the `marketplace_*` views.

### Step 2 — GitHub OAuth App (user login) · https://github.com/settings/developers
1. **New OAuth App**. Authorization callback URL (Supabase shows the exact
   value on the provider page):
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. Collect Client ID 🟢 and generate a Client Secret 🔴.
3. In Supabase **Authentication → Providers → GitHub**: paste both, enable.
   (These two values live in Supabase's dashboard, not in your env vars.)

### Step 3 — GitHub App (repo reads + PR delivery) · https://github.com/settings/apps
Separate from Step 2. **New GitHub App** with:
- Homepage URL: your production URL
- Webhook URL: `https://<YOUR_DOMAIN>/api/webhooks/github`
- Webhook secret: generate a random string 🔴 → `GITHUB_APP_WEBHOOK_SECRET`
- Repository permissions: **Contents: Read and write**, **Pull requests:
  Read and write**, **Metadata: Read-only**
- Installable by: **Any account**

Collect after creation:
- App ID 🟢 → `GITHUB_APP_ID`
- App slug 🟢 → `GITHUB_APP_SLUG`
- Client ID 🟢 → `GITHUB_APP_CLIENT_ID`
- Generate Client Secret 🔴 → `GITHUB_APP_CLIENT_SECRET`
- **Generate a private key** → downloads a `.pem` 🔴 →
  `GITHUB_APP_PRIVATE_KEY` (paste the full PEM including the BEGIN/END
  lines; `\n`-escaped is also handled)

### Step 4 — Anthropic (translation) · https://console.anthropic.com/settings/keys
1. Create an API key 🔴 → `ANTHROPIC_API_KEY` (worker host only).
2. Model env vars are optional — defaults are already the cost-optimal
   ladder: `ANTHROPIC_MODEL=claude-sonnet-5`,
   `ANTHROPIC_ESCALATION_MODEL=claude-opus-4-8`. Set them only to override.
3. Add a **spend limit** in Console → Billing (e.g. $25/mo to start) so a
   bug can't run up a bill before T1.5 rate limiting ships.

### Step 5 — Worker host (Fly.io recommended) · https://fly.io
The worker needs Docker; Netlify cannot run it. After T1.1 lands the deploy
artifacts (`worker/Dockerfile`, `fly.toml`, `worker/DEPLOY.md`):
```bash
fly launch          # from worker/, per DEPLOY.md
fly secrets set NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  ANTHROPIC_API_KEY=... WORKER_ID=worker-prod-1
fly deploy
```
Until T1.1 is built, the interim option is any VM with Docker (Hetzner /
DigitalOcean, ~$6/mo): clone the repo, `pnpm install`, build the 5 sandbox
images (`pnpm run worker:build-images`), set the same env vars, run
`pnpm worker` under systemd.

### Step 6 — Whop (payments) · https://whop.com + https://dev.whop.com
1. Create the **platform (parent) company**.
2. From the developer/API settings collect:
   - Company API key 🔴 → `WHOP_API_KEY`
   - Webhook signing secret 🔴 → `WHOP_WEBHOOK_SECRET`
   - Platform company id 🟢 (`biz_...`) → `WHOP_PLATFORM_COMPANY_ID`
3. Register the webhook endpoint: `https://<YOUR_DOMAIN>/api/webhooks/whop`
4. ⚠️ **Paste to the agent** (T1.2, before real money): the doc excerpts for
   webhook signature verification, company/plan/checkout API shapes, **and
   who bears the payment-processing fee** — the code carries VERIFY markers
   until these are reconciled, and the fee answer decides the price floor
   (`docs/PRICING.md` §4).

### Step 7 — Netlify (frontend + API) · https://app.netlify.com
1. **Add new site → Import from Git** → select this repo (build config comes
   from `netlify.toml`).
2. **Site settings → Environment variables** → set everything in the table
   below marked *Netlify*.
3. **Domain management** → attach your domain, follow the DNS steps, then
   set `NEXT_PUBLIC_APP_URL` to the final `https://` URL.

### Step 8 — Later milestones (5–10 min each, when the task ships)
| Service | Website | Value → env var | Needed for |
| --- | --- | --- | --- |
| Sentry | https://sentry.io | DSN 🟢-ish → `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | T3.1 error tracking |
| Resend | https://resend.com | API key 🔴 → `RESEND_API_KEY` (+ verify your domain) | T5.3 email |
| Plausible | https://plausible.io | site domain → `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | T7.5 analytics |
| UptimeRobot | https://uptimerobot.com | (no env var — point it at `/api/health`) | T3.4 monitoring |

### Consolidated env-var table

| Env var | From step | Secret | Netlify | Worker |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 1 | no | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1 | 🔴 | ✅ | — |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 | 🔴 | ✅ | ✅ |
| `GITHUB_APP_ID` | 3 | no | ✅ | — |
| `GITHUB_APP_SLUG` | 3 | no | ✅ | — |
| `GITHUB_APP_CLIENT_ID` | 3 | no | ✅ | — |
| `GITHUB_APP_CLIENT_SECRET` | 3 | 🔴 | ✅ | — |
| `GITHUB_APP_PRIVATE_KEY` | 3 | 🔴 | ✅ | — |
| `GITHUB_APP_WEBHOOK_SECRET` | 3 | 🔴 | ✅ | — |
| `ANTHROPIC_API_KEY` | 4 | 🔴 | — | ✅ |
| `ANTHROPIC_MODEL` (opt; default `claude-sonnet-5`) | 4 | no | — | ✅ |
| `ANTHROPIC_ESCALATION_MODEL` (opt; default `claude-opus-4-8`) | 4 | no | — | ✅ |
| `WORKER_ID` / `WORKER_POLL_INTERVAL_MS` / `WORKER_CLAIM_TIMEOUT_MINUTES` (opt) | 5 | no | — | ✅ |
| `WHOP_API_KEY` | 6 | 🔴 | ✅ | — |
| `WHOP_WEBHOOK_SECRET` | 6 | 🔴 | ✅ | — |
| `WHOP_PLATFORM_COMPANY_ID` | 6 | no | ✅ | — |
| `NEXT_PUBLIC_APP_URL` | 7 | no | ✅ | — |
| `NEXT_PUBLIC_REAL_BACKEND=true` | 7 | no | ✅ | — |
| `SINGULARITY_REAL_BACKEND=true` | 7 | no | ✅ | — |
| `SINGULARITY_TRANSLATION_MODE` (opt; default `on_demand`) | 7 | no | ✅ | — |

### Final verification (after steps 1–7)
1. `https://<DOMAIN>/api/health` → `{"status":"ok"}` and `/api/ready` →
   `ready`.
2. Sign in with GitHub; publish a small test asset; watch the worker verify
   the source language and flip it to `published`.
3. On the asset page, request a second language; confirm the worker
   translates (Sonnet), tests, and the badge turns verified.
4. From a second account: complete Whop **test-mode** checkout → webhook
   fires → PR or download delivered → `payments` row shows the 70/25/5
   split.
5. Confirm `asset_variants.translation_cost_cents` is populated and sanity-
   check it against `docs/PRICING.md` §3.
6. Rotate any key that ever touched chat or a commit.

---

*Maintained alongside the code. When a task lands, check it off in the PR
that closes it; when reality diverges from this plan, update the plan.*
