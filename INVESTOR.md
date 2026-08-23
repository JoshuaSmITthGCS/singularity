# Singularity — Investor & Product/Technical Brief

> A combined business case, product requirements summary, and technical overview
> for **Singularity**, the verified multi-language marketplace for game code.
> Figures marked *(target)* are projections, not realized results.

---

## 1. The one-liner

**Singularity lets a game developer publish a piece of code once and sell it —
already translated and test-verified — to developers working in any of five
languages and a dozen engines.** Every variant a buyer can purchase has been
compiled and passed its tests in that exact language first.

---

## 2. The problem

The game-dev ecosystem is fragmented by language and engine:

- A combat system written for **Unity (C#)** is useless to an **Unreal (C++)**
  or **Godot** team without a costly, error-prone manual port.
- Existing code marketplaces (Unity Asset Store, itch.io, CodeCanyon) are
  **single-ecosystem** and **unverified** — buyers can't see whether code even
  compiles in their setup until after they've paid.
- Hand-porting between engines means re-deriving coordinate systems, unit
  scales, physics constants, and idioms — exactly the work that produces subtle,
  expensive bugs.

The result: reusable game logic is trapped inside the ecosystem it was born in,
and a developer's addressable market is a fraction of what it could be.

---

## 3. The solution

A marketplace built around **AI translation + automated verification**:

1. **Publish once.** A developer uploads source + tests in their native language.
2. **Translate everywhere.** An LLM translates the code and its tests into the
   other languages, applying **engine-aware adaptations**: coordinate-system
   conversion (Y-up ↔ Z-up), unit scaling (meters ↔ centimeters), gravity
   constants, naming conventions, standard-library and error-handling idioms,
   and engine-API mappings (e.g. Unity `Transform.Translate` → Godot
   `Node3D.translate`).
3. **Verify automatically.** Each translated variant runs its tests inside an
   isolated Docker sandbox. Only variants that **pass** are sold — a variant
   that fails to compile, or whose suite goes red, is never listed.
4. **Buy with confidence.** Buyers see a green/yellow/red badge per language and
   purchase the variant for their engine, delivered as a GitHub PR or download.

**The moat is verification.** Translation alone is a commodity; translation that
has been compiled and exercised against a real suite in the target language,
before anyone pays for it, is the product.

**What the badge attests today — and what it does not.** The code and its tests
are translated in the same model call, so a green badge proves the variant
compiles and is *self-consistent* with its translated suite. It does not yet
prove semantic equivalence with the original: an assertion the model weakened
while translating would still go green. Closing that gap — pinning expected
values from a source-language run, or differential-testing the variants against
each other — is the highest-value item on the near-term roadmap (§9), and it is
what turns a strong wedge into a durable one. See `docs/AUDIT.md` §2.

---

## 4. Why now

- **LLM code translation crossed the usefulness threshold** — structured-output
  models can produce idiomatic, test-passing translations across languages.
- **Cheap, isolated compute** (containerized sandboxes) makes per-asset
  verification economical.
- **Creator-economy infrastructure** (Whop connected accounts) removes the need
  to build payments/payouts/KYC from scratch.
- **Game dev is bigger and more polyglot than ever** — Unity, Unreal, Godot,
  and web engines all command large, separate developer bases.

---

## 5. Product (PRD summary)

### 5.1 Users
- **Developers (supply):** publish reusable systems (pathfinding, inventory,
  physics, netcode, procedural generation) and earn across every ecosystem.
- **Buyers (demand):** acquire verified, drop-in code in their own language and
  engine, with delivery straight into their repo.

### 5.2 Core jobs-to-be-done
| User | Job |
| --- | --- |
| Developer | "Sell my code to more than just my own engine's community, without porting it myself." |
| Buyer | "Get working code for *my* engine that I can trust, without rewriting someone else's port." |

### 5.3 Key features (built)
- **Publish wizard** — paste code or connect a GitHub repo; declare a complexity
  tier (price is computed, not entered).
- **Structured TagSchema** — versioned, controlled-vocabulary tags (genre,
  purpose, actions, compatible engines, complexity) with developer and
  LLM-assisted sources, powering precise discovery.
- **Verified variants** — per-language pass/fail badges from real test runs.
- **Structured + free-text search** — filter by genre/purpose/engine/complexity/
  language; always returns a useful result set (5–10, with a broadened fallback).
- **Client environment config** — buyers store their native setup (language,
  engine, unit system, naming convention, delivery preference) so deliveries
  match their codebase.
- **Delivery** — GitHub pull request (with adaptation notes) or direct download.

### 5.4 Trust & safety
- Source code is private (RLS); public listings expose only summaries.
- Sandboxed test execution: install stage with tight limits, then a
  **network-off, read-only** test stage.
- Vulnerability disclosure endpoint (`/.well-known/security.txt`).

---

## 6. Technology (technical overview)

| Layer | Choice |
| --- | --- |
| Web + API | Next.js 15 (App Router), React 19, TypeScript, Tailwind 4 |
| Data + auth | Supabase (Postgres, Auth, Row-Level Security), GitHub OAuth |
| AI translation | Anthropic Claude (Messages API, structured/typed output, prompt caching) |
| Verification | Docker sandboxes, one image per language, driven via `dockerode` |
| Payments | Whop ("Whop for Platforms" connected accounts + payouts) |
| Worker | Long-running Node process; `FOR UPDATE SKIP LOCKED` job queue |

**Pipeline:** `publish → translate → test → (source passes) → score → price →
publish → buy → deliver`. The translation/verification worker scales
horizontally — multiple instances claim jobs without collision via row locking.

**Data anchoring:** every user has an immutable `singularity_uid` and every
asset carries a `content_hash`, with reserved `onchain_address` / `blockchain_uid`
fields — the schema is ready for on-chain provenance without requiring it today.

**Resilience by design:** the entire app runs in a **demo mode** with seeded
fixtures and no external dependencies, which keeps the product demoable and
testable independent of third-party uptime.

See `CLAUDE.md` for the full architecture, schema, and flow documentation.

---

## 7. Business model & unit economics

### 7.1 Revenue
Singularity takes a **platform fee on every sale**. The split is encoded in the
product (`src/lib/constants.ts`):

| Recipient | Share |
| --- | --- |
| Developer | **70%** |
| Platform | **25%** |
| Referral reserve | **5%** |

### 7.2 Pricing
Prices are **computed by a unit-economics formula**, not set arbitrarily by
sellers — this keeps the catalog priced consistently and resists gaming:

```
price = BASE × complexity_multiplier  +  quality_score × quality_bonus
        BASE = $0.50
        complexity_multiplier:  low 1.0 | medium 2.5 | high 5.0
        quality_bonus = $0.20 per quality point (score 0–5)
```

A developer declares a complexity tier at publish. The **quality score is earned
from verification results**: a verified base, plus suite depth (log-scaled, so a
thorough suite counts for more than a token one), plus **cross-language
portability** — the share of sibling languages that reproduced the result.
Portability is the signal this architecture is uniquely able to observe, and it
rises as variants complete, so the asset is repriced as evidence arrives.

**Open item:** the formula's ceiling is **$3.50 per asset** — well under the
$20–$200 band comparable scripting assets command elsewhere, and thin against
the per-publish inference cost of translating one asset into four languages.
The constants have not been revisited against real comparables. See
`docs/AUDIT.md` §3.

### 7.3 Why the margins are attractive
- **Marginal cost per sale is near zero** — translation and verification happen
  **once at publish**, then every subsequent sale of that variant is pure
  delivery.
- **Supply compounds:** one published asset becomes up to five sellable variants.
- **No inventory, no fulfillment** — software delivered via PR/download.

### 7.4 Growth loops
1. **Cross-ecosystem reach** — a developer publishing for one engine
   automatically gains buyers in four others, increasing seller LTV and
   attracting more supply.
2. **Referral reserve (5%)** funds acquisition incentives baked into the split.
3. **Verification trust** lowers buyer hesitation, raising conversion and repeat
   purchase.

---

## 8. Market

- **Total:** the global game-development tools/assets market, spanning millions
  of developers across Unity, Unreal, Godot, and web engines.
- **Serviceable:** developers who build and reuse modular game systems and
  currently sell into a single ecosystem.
- **Obtainable (early):** indie and mid-size studios already buying assets, plus
  developers monetizing reusable systems — the segment most underserved by
  single-engine, unverified marketplaces.

**Competitive position:** existing marketplaces are single-ecosystem and
unverified. Singularity is the only one offering **cross-language, test-verified
delivery** — translation quality plus pre-purchase proof is the wedge.

---

## 9. Status & roadmap

**Today (MVP — implemented):**
- Five-language publish + engine-aware AI translation
- Docker verification across all languages with per-language badges
- Structured TagSchema + filtered/free-text search
- Formula pricing with quality scoring
- Client environment configuration
- GitHub-PR and download delivery
- Whop payments, connected accounts, and payouts
- LLM auto-tagging (`llm_v1` tag versions)
- Full demo mode for zero-dependency evaluation

**Near term:**
- **Independent verification oracle** — pin expected values from a
  source-language run, or differential-test variants against each other, so a
  green badge attests semantic equivalence and not only self-consistency (§3)
- Re-derive the pricing formula against real comparables and measured
  per-publish inference cost (§7.2)
- Ratings/reviews and richer asset analytics
- Auto-retry for failed variants

**Later (architected for, intentionally deferred at MVP scale):**
- ElasticSearch + semantic re-ranking for catalog-scale discovery
- On-chain provenance/settlement (data anchors already in the schema)
- Hardened sandboxing (gVisor) and a microservice/Kubernetes split as volume
  demands
- Additional languages/engines (e.g. Rust, GDScript, mobile SDKs)

The MVP deliberately runs as a focused monolith. The expensive infrastructure
described above is **planned, not prematurely built** — capital goes toward
proving the marketplace loop first, then scaling the parts that volume actually
stresses.

---

## 10. Summary

Singularity turns single-ecosystem game code into a cross-language, **verified**
product. The technology pairs LLM translation with automated test verification
so buyers get code that provably works in their engine. The economics are
software-marketplace economics — near-zero marginal cost *per sale*, a 25%
platform take, and supply that compounds five-fold per asset. The hard part —
engine-aware translation, compiled and exercised in a sandbox across five
languages before anything is listed — is built and working today. The pricing
constants and the strength of the verification oracle are both open items,
documented honestly in `docs/AUDIT.md`.

---

*Prepared 2026-06-01, revised 2026-08-23. Projections marked (target) are illustrative. See
`README.md` to run the product and `CLAUDE.md` for full technical detail.*
