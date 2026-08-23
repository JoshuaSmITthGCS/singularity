# Singularity — Validity Audit

**Date:** 2026-08-22 · **Scope:** `main` @ `bb607b5` · **Method:** static read of
`src/`, `worker/`, `supabase/`, plus `pnpm lint`, `tsc --noEmit`, `pnpm test`,
`pnpm build`, and executable reproduction of the two worker logic defects.

This audit asks one question: **does the product do what `CLAUDE.md` and
`INVESTOR.md` say it does?** It is a correctness and claim-verification pass, not
a style review.

---

## 0. Verdict

The repository is real, coherent, and well above prototype quality. Every gate
passes and the architecture matches its documentation at the structural level.

| Gate | Result |
| --- | --- |
| `pnpm lint` | clean |
| `pnpm exec tsc --noEmit` (app) | clean |
| `pnpm exec tsc --noEmit` (worker) | clean |
| `pnpm test` | 21 passed / 21 |
| `pnpm build` | succeeds, 20 routes |

But the claim that carries the entire thesis — *"only variants that actually
pass are listed"* — is **not true as shipped**, in two independent ways:

1. **C# and C++ variants can never pass.** A logic defect makes their status
   unconditionally `failed`, regardless of the tests. That is Unity and Unreal —
   the two engines the go-to-market document names as the beachhead.
2. **The tests that gate a variant are themselves LLM-translated.** Nothing
   checks the translated suite against the original's behavior, so "the tests
   passed" proves internal self-consistency, not preserved semantics.

Findings are ordered by impact on the thesis, not by line count.

---

## 1. Critical — C# and C++ variants can never be sold

> **Status: fixed** (commit following this audit). Report parsers for `.trx` and
> GoogleTest JSON added in `worker/src/test-report.ts`, the null-folding status
> guard corrected, the install-stage gate and both Dockerfile uids repaired, and
> the whole path covered by `worker/src/test-report.test.ts`. The Docker images
> themselves have not been rebuilt and run — see §12. The original finding is
> kept below as the record.

**Where:** `worker/src/test-runner.ts:74`, with `parseReport()` at
`worker/src/test-runner.ts:132`.

`runTests()` decides pass/fail with:

```ts
const status = test.statusCode === 0 && parsed.failed === 0 ? "passed" : "failed"
```

`parseReport()` only ever reads `reports/report.json`. But the test commands
write somewhere else for two languages (`worker/src/test-runner.ts:112`):

| Language | Report written to | Parsed? |
| --- | --- | --- |
| javascript / typescript | `/reports/report.json` | yes |
| java | `/reports/surefire-reports/*.xml` | yes — dedicated fallback |
| **csharp** | `/reports/test-results.trx` | **no parser exists** |
| **cpp** | `/reports/gtest-results.json` | **no parser exists** |

With no `report.json`, `parseReport()` returns `{total: null, passed: null,
failed: null}`. The guard then evaluates `null === 0`, which is `false` in
JavaScript — so `status` is `"failed"` **even when the container exits 0 with a
fully green suite**. Reproduced:

```
csharp/cpp, all tests green, exit 0 -> status: failed
```

Downstream this is not cosmetic. `POST /api/procurements` refuses any variant
whose status is not `passed` (`src/app/api/procurements/route.ts:78`), so **no
C# or C++ variant is ever purchasable**. If a developer publishes in C# or C++,
the source-language variant also fails, so `worker/src/index.ts:82` never fires
and **the asset never leaves `verifying` — it is never published at all.**

Two of five advertised languages are non-functional, and they are the two that
map to Unity and Unreal.

**A second, independent breakage in the same two images.** `runContainer()` sets
`User: "1000:1000"` (`worker/src/test-runner.ts:212`), but:

| Image | User created |
| --- | --- |
| `node` / `typescript` / `java` Dockerfiles | uid **1000** — matches |
| `csharp.Dockerfile` / `cpp.Dockerfile` | uid **1001** (`testrunner`) — **mismatch** |

Those two containers therefore run as a uid that does not exist in the image and
owns no home directory. `dotnet restore` needs a writable `$HOME` for
`~/.nuget`, and `csharp.Dockerfile` puts its tooling on `PATH` at
`/root/.dotnet/tools`, unreadable to uid 1000. Even after the report-parsing fix,
the C# install stage will likely still fail.

**Fix:** add `.trx` and gtest-JSON parsers (mirroring `parseSurefireReports`),
treat `parsed.failed === null` as "unknown" rather than folding it into failure,
and align the two Dockerfiles on uid 1000.

**Update — the uid problem was worse than this audit found.** Work landed on
`main` in parallel (`f0e983e`, `fd4151e`, `9b87b3e`, `77351d4`) shows the
mismatch broke image *builds*, not just runtime: `node:20-alpine` already ships
a uid-1000 `node` user, so `adduser -D -u 1000 runner` failed outright and the
node and typescript images never built at all. The C++ image also built
GoogleMock from `/usr/src/gmock`, a path Ubuntu does not ship. So
`pnpm run worker:build-images` was failing at the first image and **no language
was verifiable**, not two. Those commits fix all five images by creating the
uid-1000 user only when it is free and running `USER 1000:1000` explicitly;
that pattern is more robust than the `userdel` approach this branch first used
and supersedes it.

---

## 2. Critical — "verified translation" does not verify what the pitch claims

> **Status: claim corrected, mechanism still open.** `INVESTOR.md` §3 and §10 and
> `CLAUDE.md` §13 now state what the badge actually attests. Building an
> independent oracle is a design decision, not a mechanical fix — it is the top
> near-term roadmap item. Finding stands.

`INVESTOR.md` §3 states the moat plainly: *"Translation alone is a commodity;
translation you can trust because the tests passed is the product."*

But `translateVariant()` translates **the code and the tests in the same call**
(`worker/src/translator.ts:7-29` — `translated_code` and `translated_tests` are
sibling fields of one structured output). `runTests()` then runs the translated
tests against the translated code.

Both sides of the equation are produced by the same model in the same pass.
Nothing anchors the translated suite to the original's observable behavior:

- If the model weakens an assertion, loosens a float tolerance, or drops an edge
  case while translating the suite, the sandbox goes green and the variant is
  listed as verified.
- The failure mode is silent and correlated: the same misunderstanding that
  corrupts the code corrupts the test that would have caught it.
- This risk is *highest* exactly where the marketing is strongest — the
  physics/unit-conversion rules at `worker/src/translator.ts:39-46`. A gravity
  constant scaled wrongly in both the implementation and its expected value
  still passes.

The green badge is currently evidence of **self-consistency**, not of
**preserved semantics**. That is a materially weaker claim than the one being
sold, and it is the claim a technical diligence reviewer will test first.

**Fix direction:** make the oracle independent of the translation. Options, in
increasing strength — pin expected values from a source-language run and forbid
the model from altering them; generate I/O golden vectors from the source and
assert the translated code against those; or run differential testing across
both variants. Until one exists, the badge should read "compiles and passes a
translated suite," which is honest and still useful.

---

## 3. High — the pricing formula cannot support the business it is attached to

> **Status: documented, not changed.** The constants are a business decision and
> picking a number is the founder's call, not this audit's. `INVESTOR.md` §7.2
> and `CLAUDE.md` §8 now flag the ceiling and point here. Finding stands.

`src/lib/pricing.ts` (mirrored in `worker/src/pricing.ts`) caps out at:

```
max price = $0.50 × 5.0 (high complexity) + 5.0 × $0.20 (max quality) = $3.50
```

So the **most expensive asset the platform can sell is $3.50**, of which the
platform keeps 25% = **$0.875** and the developer takes $2.45.

Three consequences, all verifiable from the repo:

**a. It contradicts the market model.** `Data room/Market research …md` puts SOM
at $1.31B. At $3.50 per transaction, capturing even 1% of that SOM
(~$13.1M GMV) requires ~3.7 million individual sales. Nothing in the go-to-market
plan describes volume at that order.

**b. It is below cost at low sales counts.** `INVESTOR.md` §7.3 says "marginal
cost per sale is near zero." True per *sale* — but the *publish* cost is not.
Each publish fans out to four cross-language translation calls at
`max_tokens: 32000` with adaptive thinking on an Opus-tier model
(`worker/src/config.ts` defaults to `claude-opus-4-8`, $5/$25 per MTok), plus
five Docker runs. That is plausibly $0.50–$2.00 of inference per asset. At
$0.875 platform revenue per sale, **an asset must sell repeatedly before the
platform recovers the cost of listing it** — and there is no floor, no minimum
sales requirement, and no cost-recovery term in the formula.

**c. It is far below the comparable market.** Scripting assets on the Unity Asset
Store are routinely $20–$200. A formula that prices a "high complexity" combat
system at $3.50 is not underpricing a commodity — it is signalling that the asset
is worthless. This should be treated as a pricing-strategy bug, not a constant to
tune.

**Related:** `Data room/Business details …md` describes revenue as "price per
line of code, at scale." No line-count term exists anywhere in either pricing
module. The data room and the code describe different businesses.

---

## 4. High — `quality_score` is decorative

> **Status: fixed.** Rewritten in `worker/src/pricing.ts` around three inputs
> that vary independently — verified base, log-scaled suite depth, and
> cross-language portability — and re-scored after every variant rather than
> only the source one. Covered by `worker/src/pricing.test.ts`.

**Where:** `worker/src/pricing.ts` `computeQualityScore()`.

The function reads as a 0–5 gradient driven by pass rate. It is not, because
`runTests()` only ever emits `"passed"` when `parsed.failed === 0` — which means
`testsPassed === testsTotal` and the pass rate is always exactly 1.0. Every
reachable input produces one of three values:

```
{status:"passed", testsTotal:12, testsPassed:12} -> quality_score 5
{status:"passed", testsTotal:3,  testsPassed:3 } -> quality_score 5
{status:"passed", testsTotal:null,...          } -> quality_score 3   (unmeasured suite)
{status:"failed", ...}                          -> quality_score 0   (never published)
```

So the "quality bonus" is a two-valued flag worth either $1.00 or $0.60, and
since a `failed` asset is never published, **every live asset scores 5.0 or 3.0**.
`INVESTOR.md` §7.2's "quality score is earned from verification results" and
"higher-quality assets price higher — automatically and defensibly" describe a
mechanism that does no work. Note the perverse ordering, too: an asset whose test
count could not be parsed scores 3.0 and is priced *lower* than one with a single
trivial assertion.

To actually differentiate, the score needs inputs the pipeline does not yet
collect — test count and depth, coverage, translation `confidence` (already
returned by the translator and stored, but never read by the pricer), or
cross-variant agreement.

---

## 5. Medium — demo-mode toggle is an OR, and the docs say AND

> **Status: fixed.** `src/lib/demo-mode.ts` now requires both switches, matching
> the documented and safer reading.

**Where:** `src/lib/demo-mode.ts`.

```ts
return process.env.NEXT_PUBLIC_REAL_BACKEND !== "true" &&
       process.env.SINGULARITY_REAL_BACKEND !== "true"
```

Demo mode requires *both* vars to be non-`"true"`, so **real-backend mode
activates when _either_ one is `"true"`.** `CLAUDE.md` §4 states the opposite:
`isDemoMode() === true // unless NEXT_PUBLIC_REAL_BACKEND="true" AND
SINGULARITY_REAL_BACKEND="true"`.

This matters because `NEXT_PUBLIC_*` is the client-exposed, easily-set half. A
deploy that sets only `NEXT_PUBLIC_REAL_BACKEND=true` — exactly what someone
reading the docs would consider a half-finished, still-safe configuration —
flips the server into real-backend mode against a possibly unconfigured Supabase.
Either make the code match the documented AND, or fix the doc. The AND is safer.

---

## 6. Medium — PostgREST filter injection in free-text search

> **Status: fixed.** `freeTextFilter()` in `src/lib/marketplace/search.ts` quotes
> the value so separators are literal, with escaping for quotes and backslashes.
> Covered by `src/lib/marketplace/search.test.ts`.

**Where:** `src/lib/marketplace/search.ts:38`, schema at
`src/lib/validation.ts:54`.

```ts
query = query.or(
  `title.ilike.%${params.q}%,short_description.ilike.%${params.q}%,summary.ilike.%${params.q}%`
)
```

`q` is validated only as `z.string().trim().max(300)` — the PostgREST filter
metacharacters `,`, `.`, `(`, and `)` all pass through into a string that is
parsed as filter syntax. A crafted `q` can append OR-clauses or malform the
expression.

This is not SQL injection and the blast radius is bounded: `marketplace_search`
is a public view that already omits source code, so the realistic impact is
result manipulation and error-based probing rather than data disclosure. It is
still the one place in the codebase where untrusted input reaches a query
grammar unescaped, and it contradicts `CLAUDE.md` §9's "never trust raw input."

**Fix:** strip or percent-escape PostgREST metacharacters in `q` before
interpolation, or use `.textSearch()` / an RPC with a bound parameter.

---

## 7. Medium — the advertised size limits are unreachable

> **Status: fixed.** `max_tokens` raised 32000 → 64000 in
> `worker/src/translator.ts`, which makes the existing 80k/80k publish caps
> reachable. Streaming was already in use, so the higher ceiling costs nothing.

`SOURCE_CODE_MAX_LENGTH` and `TEST_CODE_MAX_LENGTH` are both 80,000 characters
(`src/lib/constants.ts:45`), and `createAssetSchema` accepts up to both.

But translation must emit code **and** tests **and** an adaptation log **and** PR
notes inside a single `max_tokens: 32000` response
(`worker/src/translator.ts:111`). A maxed-out asset is ~160,000 characters of
output, roughly 40,000+ tokens — past the ceiling. The translator detects this
and throws `"Claude translation hit max_tokens before completing — asset too
large"` (`worker/src/translator.ts:130`).

So an asset can pass publish validation and then fail every cross-language
variant with an opaque error. The real combined ceiling is somewhere near 60,000
characters. Either raise `max_tokens` (streaming is already in use, so 64k is
available), chunk the translation, or lower the validation limits to something
the pipeline can actually honor.

---

## 8. Medium — mandatory tests are the real supply constraint

> **Status: no code change — this is a market question, not a defect.** It is
> hypothesis H2 in `docs/MARKET_RESEARCH_PROMPT.md`. Finding stands.

`createAssetSchema` requires `test_code: z.string().min(1)`
(`src/lib/validation.ts`). There is no path to publish without a test suite.

This is architecturally correct — the whole model collapses without tests — but
it is an unpriced go-to-market assumption. Game code, and gameplay code
especially, is among the least-tested code in the industry: it is engine-coupled,
`MonoBehaviour`-bound, frame-dependent, and typically validated by playtesting
rather than assertions. The supply side is not "game developers with reusable
code"; it is the much smaller "game developers with reusable code **that has a
runnable, engine-independent test suite**."

No document in the repo sizes that population. It should be the first thing the
market research answers, because it bounds supply before demand ever matters.

---

## 9. Low — documentation drift

> **Status: fixed.** All three statements corrected in `CLAUDE.md`.

`CLAUDE.md` is otherwise accurate, but three statements no longer match:

| Claim | Reality |
| --- | --- |
| §6.3: `POST /api/procurements` "runs delivery inline" | Creates an `awaiting_payment` row and returns a Whop checkout URL; delivery runs from the Whop webhook via `fulfillProcurement()` |
| §13: LLM auto-tagging is "deferred, not built" | Built and wired — `worker/src/tagger.ts`, called at `worker/src/index.ts:99` |
| §4: demo mode needs both flags true (AND) | Code uses OR — see finding 5 |

---

## 10. Low — coverage, concurrency, and dependency notes

- **Test coverage is 21 tests over three pure modules** (`pricing`,
  `validation`, `taxonomy`). Every defect in this audit lives in untested code:
  the worker pipeline, delivery, search, and the API routes have no tests at all.
  A single unit test asserting `runTests()` status for a null-report input would
  have caught finding 1.
- **Non-atomic counter updates.** `fulfillProcurement()` does read-modify-write
  on `total_earnings_cents` and `procurement_count`
  (`src/lib/procurements/fulfill.ts`). Concurrent purchases of the same asset
  will lose increments. Use a Postgres RPC with `set x = x + n`.
- **Whop webhook signing is an acknowledged guess.** `src/lib/whop/webhook.ts`
  says so in its own header comment — the Standard Webhooks scheme was inferred,
  not confirmed against Whop's docs. The HMAC itself is implemented correctly
  (constant-time compare, replay window, rotation support), so the risk is not
  forgery but total non-delivery: if the scheme is wrong, every real payment
  fails signature verification and no purchase is ever fulfilled. Confirm against
  a live test event before launch.
- **`claude-opus-4-8` is valid but one generation behind.** `claude-opus-5` is
  current at the same $5/$25 pricing. The SDK usage itself checks out — adaptive
  thinking, `output_config.effort`, `zodOutputFormat`, and the cached system
  preamble are all correct for `@anthropic-ai/sdk` 0.100.1.
- **`claim_next_variant` is correct.** `FOR UPDATE SKIP LOCKED` with a
  timeout-based reclaim — genuinely safe for horizontal worker scaling, as
  claimed.

---

## 11. What to fix, in order

1. ~~Parse `.trx` and gtest JSON; stop treating `null` as failure; align the
   C#/C++ image uids.~~ **Done** — see §1 and §12.
2. ~~Restate the badge honestly~~ **done** — but **give verification an oracle
   independent of the translation**. Still open, and still the highest-value
   item in the codebase.
3. **Re-derive the pricing formula** against real comparables and measured
   per-publish inference cost. Still open — needs a founder's decision.
4. ~~Feed `quality_score` inputs that actually vary.~~ **Done.**
5. ~~Escape `q`; fix the demo-mode AND/OR; reconcile the size limits.~~ **Done.**
6. ~~Add pipeline tests — start with `runTests()` status resolution.~~ **Done**
   for the report/status path, pricing, and search filtering (47 tests, up from
   21). Delivery, the API routes, and the translator remain untested.

Everything mechanical is fixed. What remains — findings 2, 3 and 8 — are a
design decision, a business decision, and a market question respectively. They
are what a technical diligence reviewer will probe first, and none of them can
be honestly resolved by editing code.


---

## 12. Follow-up — what the C#/C++ fix changed, and what is still unverified

Finding 1 turned out to have four independent causes stacked on the same path,
all of which had to go for either language to produce a sellable variant.

| Cause | Fix |
| --- | --- |
| No parser for `.trx` or GoogleTest JSON | `worker/src/test-report.ts` — parsers for both, plus the existing vitest and surefire readers, extracted into one tested module |
| `null === 0` folded "unreadable" into "failed" | `resolveTestStatus()` checks the null case explicitly and reports it as unverified rather than as a test failure |
| Install stage skipped unless the model returned a manifest, so C#/C++ reached the test stage with nothing built | `needsInstallStage()` returns true for java, csharp and cpp unconditionally — `writeJobFiles()` always writes a build file for all three |
| C#/C++ images create uid 1001 while the runner forces `1000:1000` | both Dockerfiles now own uid 1000 with a writable `HOME` |

Three supporting changes were required to make those land:

- **C# gets a writable workspace during the test stage**, as Java already did —
  `dotnet test` compiles, which a read-only bind mount cannot support. Network
  stays off for every test stage; that is the boundary that actually matters.
- **The install timeout moved from 30s to 180s.** A cold NuGet restore, Maven
  `go-offline`, or CMake configure-and-build does not fit in 30 seconds, and the
  timeout surfaced as an opaque variant failure. C#'s test stage also gets 120s
  because it compiles; every other language keeps the tighter 60s bound on
  runaway code.
- **The generated `CMakeLists.txt` links the image's GoogleTest** via
  `find_package` instead of downloading it through `FetchContent` on every job.
  The old template could not have finished inside the install timeout and
  depended on network reachability at configure time.

**Behaviour change worth noting:** a Java run that produces no surefire XML at
all now reports unverified instead of passing with a zero count. That is the
correct reading — no report means no proof — but it is stricter than before.

**Not verified.** This environment has no Docker daemon, so the two rebuilt
images have not been built or executed. The report-parsing and status logic is
covered by 14 unit tests, including two that assert a green C#/C++ run now
resolves to `passed`, and all five new tests were confirmed to fail against the
pre-fix logic. The Dockerfile changes and the `dotnet test` / CMake command
lines are reasoned, not run. **Run `pnpm run worker:build-images` and put one
real C# and one real C++ asset through the worker before trusting this.**

One pre-existing fragility surfaces more sharply now that C#/C++ genuinely write
during their install stage: `runTests()` creates the job directory with
`fs.mkdtemp()`, so it is owned by whatever uid the worker process runs as, while
the container writes to it as uid 1000. If the worker does not run as uid 1000
(or root), the bind mount is not writable by the sandbox. This affects Java
equally and is not introduced here, but it is the next thing to check if a build
stage fails with permission errors.

Finding 2 in particular still stands: the C# and C++ badges now work, but what
they attest to is unchanged.

## 13. Follow-up — the remaining mechanical fixes

Findings 4, 5, 6, 7, 9 and the settlement race in §10 were fixed in the same
pass. Two are worth calling out because they change behaviour beyond the defect:

- **Settlement is now atomic.** `fulfillProcurement()` incremented
  `total_earnings_cents` and `procurement_count` with a read-modify-write, so
  concurrent purchases of the same asset silently dropped increments — real
  money, quietly lost. Both now increment inside one statement via the
  `record_procurement_settlement` RPC
  (`supabase/migrations/20260602000000_atomic_settlement.sql`). **This migration
  has not been applied against a live database** — no Supabase instance in this
  environment.
- **Quality scoring now runs after every variant**, not only the source one,
  because portability is only knowable once siblings finish. Publishing stays a
  one-way transition out of `verifying`, scoped by an `.eq("status",
  "verifying")` guard so a re-score cannot resurrect an archived or flagged
  asset.

Also updated: the worker's default model moved from `claude-opus-4-8` to
`claude-opus-5` (current generation, same $5/$25 pricing).

**Unverifiable here, unchanged:** the Whop webhook signing scheme (§10) is still
an inferred guess and needs one live test event to confirm. If it is wrong, no
purchase is ever delivered.
