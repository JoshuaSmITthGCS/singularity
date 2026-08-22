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

---

## 2. Critical — "verified translation" does not verify what the pitch claims

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

1. Parse `.trx` and gtest JSON; stop treating `null` as failure; align the C#/C++
   image uids. **Two of five languages are dead until this lands.**
2. Give verification an oracle independent of the translation, or restate the
   badge honestly.
3. Re-derive the pricing formula against real comparables and against measured
   per-publish inference cost.
4. Feed `quality_score` inputs that actually vary.
5. Escape `q`; fix the demo-mode AND/OR; reconcile the size limits.
6. Add pipeline tests — start with `runTests()` status resolution.

Findings 1, 4, 5, 6, 7, and 8 are mechanical and small. Findings 2 and 3 are
design questions that should be settled before the next fundraising conversation,
because they are what a technical diligence reviewer will probe first.
