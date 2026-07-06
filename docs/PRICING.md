# Pricing & Unit Economics

The money model in one page: what buyers pay, what verification costs, and the
four levers that keep the platform profitable at low operational cost. Change
any parameter here **and** in the code mirrors (`src/lib/pricing.ts`,
`worker/src/pricing.ts`, `worker/src/cost.ts`) in the same PR.

---

## 1. Price formula (v2)

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
Comparables: Unity Asset Store gameplay scripts sell for $5–$40; a variant here
additionally carries a machine-verified test run in the buyer's language, so
the range is conservative, not aggressive.

Why v1 ($0.50 base, $0.20/point) had to go: its ceiling was $3.50/asset, so the
platform's 30% take capped at ~$1.05 per sale — less than the LLM cost of
verifying most assets even once. Revenue per sale is now ~7× v1 with no change
to the formula's shape or the developer's 70% share.

## 2. Revenue split (unchanged)

Developer **70%** / platform **25%** / referral reserve **5%**
(`src/lib/constants.ts`). On the price range above the platform's gross take is
**$1.20–$7.50 per sale**.

## 3. Cost per verified asset (the opex side)

Publishing verifies only what's needed; each verified translation costs one or
two model calls plus Docker runs (compute on the worker host, ~free at MVP
volume).

Model rates (standard tier, per MTok): Sonnet 5 $3 in / $15 out; Opus 4.8
$5 in / $25 out; cache reads ~0.1× input. For a typical asset
(~15–25K input tokens with the cached rules preamble, ~5–10K output):

| Event | Model path | Est. cost |
| --- | --- | --- |
| Publish (source verify) | no LLM call | **~$0.00** |
| One requested translation | Sonnet 5, passes | **~$0.10–$0.25** |
| One escalated translation | Sonnet fails → Opus retry | **~$0.40–$0.90** |
| Worst case, all 4 targets escalated | 8 calls | ~$2.50–$3.50 |

Every call's actual token usage and estimated cost are persisted on the
variant (`model`, `tokens_input`, `tokens_output`, `translation_cost_cents`) —
margin is measured, not assumed. Per-asset margin query:

```sql
select a.id, a.title, a.price_cents,
       a.procurement_count * a.price_cents * 0.30 as platform_gross_cents,
       coalesce(sum(v.translation_cost_cents), 0) as llm_spend_cents
from assets a
left join asset_variants v on v.asset_id = a.id
group by a.id
order by llm_spend_cents desc;
```

## 4. The four levers (all implemented)

1. **Reprice (revenue ↑ ~7×).** Formula v2 above.
2. **On-demand translation (cost ↓ ~75–100% per unsold asset).** Publish
   queues only the source-language variant — a Docker test run, zero LLM
   spend. Target languages are translated only when a buyer requests them
   (`POST /api/assets/:id/variants`, "Request <language>" on the asset page).
   An asset that never sells never costs translation money. Set
   `SINGULARITY_TRANSLATION_MODE=eager` to restore translate-everything.
3. **Model tiering (cost ↓ ~40% per translation).** Translation defaults to
   **Sonnet 5** (`ANTHROPIC_MODEL`); if the translation fails verification the
   worker retries once with **Opus 4.8** (`ANTHROPIC_ESCALATION_MODEL`) and
   notes the escalation in the adaptation log. The prompt-cached rules
   preamble cuts repeat input cost a further ~10×. Source-language variants
   never call a model.
4. **Cost tracking (margin is observable).** Worker writes per-variant token
   counts and cost estimates (`worker/src/cost.ts`); rates live in one table
   and unknown models fall back to the most expensive rate so cost is never
   under-reported.

## 5. Break-even math

Platform gross per sale is $1.20–$7.50. A Sonnet-verified translation costs
$0.10–$0.25 — **the first sale of a variant covers its own verification with
margin**, and every subsequent sale of that variant is ~pure gross margin
(delivery is a GitHub API call). Even a fully-escalated translation (~$0.90)
is covered by one sale at any tier. The remaining loss vector is paying for
translations nobody buys — closed by lever 2 — and hostile publish loops —
closed by rate limiting (MASTER_PLAN T1.5, still required before launch).

## 6. Guardrails still required before real money

- **T1.5 rate limiting** — publish triggers Docker runs and variant requests
  trigger LLM calls; both need per-user budgets.
- Consider a per-asset cap on escalation retries per requester (the requeue
  path allows repeated failed→queued cycles; each costs an escalated call).

---

*Updated 2026-07-06 alongside formula v2, on-demand translation, model
tiering, and cost tracking.*
