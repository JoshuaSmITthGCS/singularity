# Enterprise Pilot Prep — Week of October 12, 2026

Responds to Dr. Harvey's Oct 9 memo ("Company Strategy and Next Steps").
Covers the readiness audit that feeds Item 3, plus drafts of Items 1, 2 and 4.

**Labels used throughout**

- **LIVE** — present in this repo and read directly. Not run in this environment
  (no Docker daemon, no `node_modules`), so "live" means *implemented*, not *demonstrated*.
- **PLANNED** — described in docs or the memo; no code.
- **TO CONFIRM** — a fact only a person outside this repo can supply.
- Nothing below is invented customer evidence. Account names, prices and dates
  that are not in the repo are left as blanks or marked as assumptions.

---

## 0. Read this first

1. **The memo's enterprise direction is a pivot the repo does not yet implement.**
   The codebase is a verified code-translation marketplace. It has no simulation
   assembly, no scenario/state capture, no expert decision records, and nothing
   manufacturing-specific (searched `src/`, `worker/`, `supabase/`, `docs/`).
2. **It does match the repo's own market research.** `docs/MARKET_RESEARCH_FINDINGS.md`
   concluded the indie marketplace is "not validated as specified" and pointed at
   verified translation for high-cost-of-error industries (§8, pivots 2 and 4).
   The memo is consistent with that finding. Say so in the pitch.
3. **The biggest unknown is catalog depth.** The memo says "use the component
   catalog to assemble simulations." `docs/AUDIT.md` §8 and market research H2 flag
   that tested, engine-independent components are scarce, and experiment E1 (can
   the catalog be stocked?) has not been run. Do not promise a catalog until the
   components for the pilot workflow are named.
4. **The verification badge attests self-consistency, not semantic equivalence**
   (`docs/AUDIT.md` §2). Enterprise diligence will probe this first. Do not claim
   verified fidelity of translated simulation behavior.

---

## 1. Readiness audit (feeds Item 3)

### 1.1 What the demo walkthrough could show today

| Step in memo's walkthrough | Status | Evidence |
| --- | --- | --- |
| Repository selection | **LIVE** | GitHub install + repo/file picker (`src/app/api/github/`, `PublishForm`) |
| Reuse / adaptation across engines | **LIVE** | Claude translation with engine-aware rules, `adaptation_log` per variant (`worker/src/translator.ts`) |
| Working behavior (tests pass in sandbox) | **LIVE, partly unproven** | Docker two-stage runner; C#/C++ paths fixed but images never built or run (`docs/AUDIT.md` §12) |
| Public walkthrough with no signup | **LIVE** | `/try-it`, rate-limited, fixed sample snippets only (`src/lib/demo-walkthrough.ts`) |
| Concrete cross-engine example | **LIVE** | `demo/` Unity C# → Unreal C++ jump controller with unit/axis conversion |
| Contributor revenue split | **LIVE** | 70 / 25 / 5, atomic settlement RPC (migration `20260602…`, not applied to a live DB per audit §13) |
| Attribution of a component into a customer artifact | **LIVE (demo only)** | `/pilot-demo` shows hash, version, adaptation note and contributor share for two fixture components. Underlying: | `content_hash`, `adaptation_log`, `repos`, procurement records exist per asset. No manifest tying several components into one composed deliverable |
| Assemble a simulation from components | **PLANNED** | Walkthrough at `/pilot-demo` uses a hand-built toy model, labelled as such |
| Scenario state / action / alternatives / rationale / outcome capture | **LIVE (demo only)** | `/pilot-demo` captures records in page state and exports JSONL; no database, API or persistence |
| Expert participant sessions, recordings, consent | **PLANNED** | No code |
| Held-out evaluation of decision data | **PLANNED** | No code |
| Manufacturing / workstation-layout components | **PLANNED** | Catalog is game scripting; none seeded for this domain |

### 1.2 Smallest missing capability for a credible demo

Not a simulation engine. For the first pilot, simulation assembly can be done by
hand and **labelled as manual**. The smallest build that changes what a buyer sees:

1. **Decision record capture** — one table plus a thin page. Fields mirror the
   memo's Capture stage: scenario id, state snapshot, action taken, alternatives
   considered, stated rationale, outcome, reviewer feedback, participant role,
   contributor provenance ids. Follows the existing demo-first / Supabase pattern.
2. **Component provenance manifest** — a record that lists each component used in
   a customer simulation (source repo, commit, `content_hash`, version, adaptation
   notes). Reuses `assets` / `asset_variants` data already stored.
3. **Export** — JSONL of decision records for the customer's evaluation team.

Everything else in the walkthrough exists or can be shown with the manual
labelled step. Estimate and scope are mine to firm up once the pilot workflow is
chosen; I have not sized this in hours.

### 1.3 Must-verify before any customer demo

- [ ] Run `pnpm run worker:build-images`; put one real C# and one real C++ asset
      through the worker (audit §12).
- [ ] Apply `20260602000000_atomic_settlement.sql` to a real Supabase project.
- [ ] Send one live Whop test event; the webhook signing scheme is inferred
      (audit §10).
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` on a clean checkout
      (audit recorded 47 passing tests; not re-run here).
- [ ] Experiment E1: sample 30 permissively licensed repos for runnable,
      engine-independent test suites. This decides whether the catalog claim holds.
- [ ] Experiment E2: diff translated tests against originals for three assets,
      to measure the self-consistency gap with your own product.

---

## 2. Item 1 — Company and pitch brief (draft)

### Company overview

Singularity helps teams reuse code across engines and languages. Contributors
connect repositories and are paid when others license their work. AI adapts the
code to a target environment, and an automated sandbox compiles and tests each
adaptation before anyone receives it.

### Enterprise value proposition (positioning to test)

> Singularity helps enterprises create tailored simulations from reusable software
> components and capture expert decisions to evaluate and improve AI systems for
> operational workflows.

- **Customer problem:** [one workflow, one decision — TO CONFIRM from discovery]
- **What Singularity builds:** one working simulation of that workflow, assembled
  from identified components with versions and adaptation work recorded.
- **What experts do:** make decisions inside scenarios; Singularity records state,
  action, alternatives, rationale and outcome.
- **What the customer receives:** the simulation, the structured decision dataset,
  an evaluation against agreed acceptance criteria, and a go / revise / stop review.

Keep four capabilities separate when demonstrating: cross-engine compatibility,
simulation accuracy, usefulness of decision data, and real-world transfer. The
memo is explicit that simulation results alone do not establish safe physical
deployment. Do not blur them.

### Investor narrative: what is true, what needs evidence

| Claim | Status | Evidence needed |
| --- | --- | --- |
| Reusable components + contributor payments is a real marketplace mechanism | LIVE (implemented, unrun end-to-end) | A completed paid license event |
| Verified adaptation across engines | LIVE with caveat | Independent oracle; E2 results (audit §2) |
| Enterprises will pay for tailored simulations | UNVALIDATED | Signed pilot or LOI |
| Expert decision data improves a customer's AI | UNVALIDATED | Held-out evaluation against a baseline |
| Repeatable across five customers | UNVALIDATED | Five discovery calls on the same workflow |
| Contributor community supplies enough components | UNVALIDATED | E1; game-jam turnout (TO CONFIRM) |

**Do not claim:** that all future AI development depends on Singularity; that the
badge proves semantic equivalence; that any model improvement exists before a
baseline-controlled evaluation; that Texas A&M is participating.

**Existing relationships** (`Data room/Business Development…md`): Texas A&M Game
Development Center (early pipeline for design testers), NSBE PCI Esports & Gaming
Initiative, Game Heads, and a CRADA exploration with NSWC Carderock. The memo says
the Texas A&M terms are unconfirmed. Treat all of these as **validation and
supply channels, not manufacturing customers.**

---

## 3. Item 2 — Customer focus (draft)

### Priority segment (proposed in memo; confirm at the meeting)

- **Industry:** manufacturing
- **Workflow:** workstation layout and material movement, one workflow, one facility
- **Recurring problem:** [TO CONFIRM — e.g., the operational constraint that makes
  layout decisions expensive to get wrong]

### Buyer and participants (all TO CONFIRM)

| Role | What to validate |
| --- | --- |
| Economic buyer | Manufacturing engineering or operations sponsor; budget owner; purchasing process |
| Expert participants | Operators, process engineers, supervisors |
| AI / robotics counterpart (if any) | The specific evaluation or training need |

### Five candidate accounts

Left blank on purpose. I found no manufacturing prospects in the repo or the data
room, and I will not supply company names that look like leads. For each row,
write the reason it fits, and set status honestly.

| # | Account | Why it fits (specific) | Status: `Prospect` / `Active conversation` | Source |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Fit test for each row:** same workflow type; a named decision owner reachable;
process data available; a constraint with a cost attached; experts accessible for
sessions; a path to a paid pilot rather than a free trial.

**Repeatable path:** discovery call → confirm workflow, decision owner, data
→ scoped pilot proposal → pilot → expansion fees. The same offer repeats if each
account has the same decision problem; test that in the first three calls.

---

## 4. Item 4 — Pilot and economics (draft)

### Scope and timeline (assumption: 8 weeks; confirm with customer)

| Stage | Weeks | Deliverable | Acceptance evidence |
| --- | --- | --- | --- |
| Define | 1 | One decision problem, baseline, permitted data uses, acceptance measures, success thresholds | Signed scope sheet |
| Assemble | 2–4 | One working simulation from identified components; versions, dependencies, adaptation work logged | Component manifest; simulation runs scenario set |
| Capture | 4–6 | Expert sessions producing scenario state, action, alternatives, rationale, outcome, reviewer feedback, provenance | Decision-record completeness rate |
| Evaluate | 6–7 | Expert credibility review; held-out task evaluation against baseline; failures and repair effort recorded | Evaluation report |
| Decide | 8 | Results review; expand, revise or stop | Written decision |

### Metrics to agree before starting

Time to a usable simulation · integration defects · expert acceptance ·
decision-record completeness · customer willingness to continue. Thresholds are
**TO AGREE with the customer** and set before the pilot starts.

### Pricing assumptions (none agreed — memo says price follows effort)

Price from effort, not from the marketplace formula. The repo's `$3.50` ceiling
(`src/lib/pricing.ts`) is for single assets and has no bearing here.

```
pilot fee = (build hours × blended rate)
          + (expert session hours × participant incentive, passed through)
          + (compute / tooling cost)
          + margin
```

Hours, rate, incentive and margin are **blank until scoped.** Expansion fees (per
the memo): scenario updates, additional workflows, evaluation runs, ongoing data
capture.

### Contributor compensation

- A quality score may inform which component is selected. It does **not** trigger
  payment.
- Payment requires an agreed licensing or usage event: a component is incorporated
  into a customer simulation under agreed terms.
- The live split is 70 / 25 / 5 (developer / platform / referral reserve), built
  for per-procurement sales. The pilot needs either a license-fee line item routed
  through that split or a manual settlement. **Decision needed.**
- Demonstrate one component end to end: source repo → component record →
  modification log → customer simulation → contributor share calculation.

### Permissions to confirm before pilot start

Code reuse and adaptation rights from each contributor; participant recording
consent; any model-training use of decision data; customer data handling and
confidentiality; who owns derived datasets.

### Customer responsibilities

Name a sponsor and decision owner; provide process information; make experts
available for scheduled sessions; agree acceptance criteria in writing; review
results at Decide.

---

## 5. Decisions for the meeting, with proposed owners

Owners and due dates are blank; the memo asks that each be agreed in the room.

| Decision / action | Proposed default | Owner | Due |
| --- | --- | --- | --- |
| Segment and pilot workflow | Manufacturing, workstation layout, one facility | | |
| Smallest build for demo | Decision-record capture + provenance manifest + JSONL export (§1.2) | | |
| Run verification checklist (§1.3) | Before any customer-facing demo | | |
| Run E1 catalog-supply sample | Before claiming catalog depth | | |
| Contributor payment path in pilot | Decide license-fee routing vs. manual | | |
| First five discovery targets | Fill §3 table | | |
| Follow-up meeting date and time | Week of Oct 12, 2026; not yet agreed | | |
