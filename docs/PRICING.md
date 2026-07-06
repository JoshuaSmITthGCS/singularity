# Pricing & Unit Economics

The money model in one page: what buyers pay, what delivery actually costs,
and the margin targets the parameters are tuned to. Change any parameter here
**and** in the code mirrors (`src/lib/pricing.ts`, `worker/src/pricing.ts`,
`worker/src/cost.ts`) in the same PR.

**Margin policy (SaaS benchmarks):** target **75–85% gross margin** on
platform revenue (direct costs: LLM verification, payment processing,
hosting). Below 70% means hosting inefficiency or underpricing — fix the
parameters, don't absorb it. Long-run **net margin target 15–25%** after
S&M/R&D, evaluated with the Rule of 40 (growth % + net margin % ≥ 40) once
there is revenue to measure.

---

## 1. Price formula (v2) — value-based, not cost-plus

```
price = max($4.00, $4.00 × complexity_multiplier + quality_score × $1.00)
```

| Parameter | Value | Where |
| --- | --- | --- |
| Base price | **$4.00** | `BASE_PRICE_CENTS = 400` |
| Complexity multiplier | low 1.0 / medium 2.5 / high 5.0 | `COMPLEXITY_MULTIPLIER` |
| Quality bonus | **$1.00/point**, quality 0–5 | `QUALITY_BONUS_PER_POINT_CENTS = 100` |
| Floor | **$4.00** | `PRICE_FLOOR_CENTS = 400` |

Resulting range: **$4 (low, unverified) → $25 (high, perfect quality)**.

**Value anchor:** the buyer's alternative is porting a gameplay system to
their language/engine by hand — realistically 2–8 developer-hours
($100–$800 at $50–100/hr) plus the risk of physics/unit bugs. At $4–$25 with
a machine-verified test run included, the buyer gets a **10–40× ROI**, which
is the "obvious yes" zone: profitable for the platform, not outrageous for
the buyer. Comps: Unity Asset Store gameplay scripts sell for $5–$40 with
*no* verification. Raise willingness-to-pay later through tiers (T7.7), not
by pushing the base curve.

## 2. Revenue split

Developer **70%** / platform **25%** / referral reserve **5%**
(`src/lib/constants.ts`). Platform revenue per sale:

| Sale price | Platform (25%) | + reserve if unspent (5%) |
| --- | --- | --- |
| $4.00 floor | $1.00 | $0.20 |
| $14.00 (medium, q4) | $3.50 | $0.70 |
| $25.00 max | $6.25 | $1.25 |

## 3. Token + cost estimates per translation (the COGS driver)

Inputs are bounded: source and tests are capped at 80 KB each
(`SOURCE_CODE_MAX_LENGTH`), and the static rules preamble (~800 tokens) is
prompt-cached (writes 1.25×, reads 0.1×). Rates: Sonnet 5 $3/$15 per MTok,
Opus 4.8 $5/$25.

| Asset size (code+tests) | ~Input tokens | ~Output tokens | Sonnet | Opus | Escalated (S fail → O) |
| --- | --- | --- | --- | --- | --- |
| Small (~2 KB) | 1.5K | 3K | **$0.05** | $0.08 | $0.13 |
| Typical (~10 KB) | 4K | 8K | **$0.13** | $0.22 | $0.35 |
| Large (near cap) | 25K | 30K | **$0.53** | $0.88 | $1.41 |

These are estimates; the worker records **actual** per-variant usage
(`model`, `tokens_input`, `tokens_output`, `translation_cost_cents`) so the
table can be re-baselined from production data. Publish itself costs ~$0.00
in LLM terms (source-language verification is a Docker run only).

## 4. Gross margin per sale

Direct costs per sale: verification (amortized over that variant's sales) +
payment processing + ~negligible hosting/delivery (a GitHub API call).

Assuming processing ≈ 2.9% + $0.30 (⚠️ **assumption** — who bears Whop's
processing fee is confirmed in MASTER_PLAN T1.2; scenarios below):

**Scenario A — processing borne by the seller side (typical for
connected-account platforms):**

| Sale | Platform rev | Verification COGS | Gross margin |
| --- | --- | --- | --- |
| $14, Sonnet-verified, 1st sale | $3.50 | $0.13 | **96%** |
| $14, escalated, 1st sale | $3.50 | $0.35 | **90%** |
| $4 floor, Sonnet, 1st sale | $1.00 | $0.13 | **87%** |
| Any repeat sale of a verified variant | 25% of price | ~$0 | **~100%** |

**Scenario B — processing borne by the platform:**

| Sale | Platform rev | Processing + verification | Gross margin |
| --- | --- | --- | --- |
| $14, Sonnet, 1st sale | $3.50 | $0.71 + $0.13 | **76%** |
| $25, Sonnet, 1st sale | $6.25 | $1.03 + $0.13 | **81%** |
| $4 floor, Sonnet, 1st sale | $1.00 | $0.42 + $0.13 | **45%** ⚠️ |

**Decision rule:** Scenario A holds → parameters stay as-is (blended margin
comfortably ≥ 80%). Scenario B holds → the $4 floor is below the 70% red
line; raise `PRICE_FLOOR_CENTS` to **500–600** and/or compute the split on
net-of-processing revenue. Do not ship real payments before T1.2 resolves
which scenario is true.

## 5. Fixed operational cost + break-even

| Item | $/month |
| --- | --- |
| Supabase Pro | $25 |
| Fly.io worker (shared-cpu-1x + volume) | $5–15 |
| Netlify | $0–19 |
| Domain | ~$1 |
| Sentry / Resend / Plausible (free tiers at MVP volume) | $0 |
| **Total** | **~$31–60** |

At an average platform take of ~$3/sale, **10–20 sales/month covers all
fixed infrastructure** — everything above that funds growth. There is no
per-seat or manual-onboarding labor in the loop, which is what keeps the
gross margin in the SaaS band.

## 6. The four cost levers (all implemented)

1. **Reprice (revenue ↑ ~7×).** Formula v2 above. v1's $3.50 ceiling put the
   platform take below the cost of a single verification.
2. **On-demand translation (cost ↓ ~75–100% per unsold asset).** Publish
   queues only the source-language variant — zero LLM spend. Targets are
   translated when a buyer requests them (`POST /api/assets/:id/variants`,
   "Request <language>" on the asset page). An asset that never sells never
   costs translation money. `SINGULARITY_TRANSLATION_MODE=eager` restores
   translate-everything.
3. **Model tiering (cost ↓ ~40% per translation).** Sonnet 5 first
   (`ANTHROPIC_MODEL`); one Opus 4.8 retry on verification failure
   (`ANTHROPIC_ESCALATION_MODEL`), noted in the adaptation log.
4. **Cost tracking (margin is observable, not assumed).** Worker persists
   per-variant token counts and cost (`worker/src/cost.ts`). Margin query:

```sql
select a.id, a.title, a.price_cents,
       a.procurement_count * a.price_cents * 0.30 as platform_gross_cents,
       coalesce(sum(v.translation_cost_cents), 0) as llm_spend_cents
from assets a
left join asset_variants v on v.asset_id = a.id
group by a.id
order by llm_spend_cents desc;
```

## 7. Growth levers that respect the margin (planned, not built)

- **Usage-based by construction:** platform revenue is a % of every
  transaction, so revenue scales with customer success at ~zero marginal
  cost — repeat sales of a verified variant are ~100% margin.
- **T7.7 Publisher Pro tier (tiered packaging):** subscription for serious
  sellers (~$19/mo): eager translation to all five languages at publish,
  priority queue, sales analytics, early access to new engines. Captures the
  high-willingness-to-pay segment without raising prices on buyers.
- **T7.4 referrals:** the 5% reserve is already carved out of every sale —
  spending it costs no new margin.

## 8. Guardrails still required before real money

- **T1.2** — confirm Whop fee mechanics (decides Scenario A vs B above).
- **T1.5 rate limiting** — publish triggers Docker runs and variant requests
  trigger LLM calls; both need per-user budgets.
- Failed-variant requeues carry a 6h cooldown for non-developers (developers
  retry freely); revisit if escalated-retry spend shows up in the margin
  query.

---

*Updated 2026-07-06: SaaS margin framework (75–85% GM target), token/COGS
estimates, break-even, alongside formula v2, on-demand translation, model
tiering, and cost tracking.*
