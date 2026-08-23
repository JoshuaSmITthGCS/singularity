# Market Research Prompt — Is Singularity a Need?

Paste everything below the line into a research-capable assistant (web search
enabled). It is self-contained: it does not assume the reader has seen the
codebase.

**Why it is shaped this way.** The prompt is adversarial by construction. This
product has a plausible-sounding pitch, which is exactly the condition under
which research tends to return flattering confirmation. So the prompt fixes the
kill criteria *before* evidence is gathered, demands the disconfirming case be
argued at full strength, and forbids the two failure modes that make research
worthless: market-size theater (TAM/SAM/SOM with no bottom-up check) and
vendor-blog citations standing in for practitioner evidence.

Replace the pricing figure in H5 if the formula changes.

---

You are a skeptical market researcher. Your client is about to spend a year and
real money building the product below. Your job is **not** to validate it. Your
job is to find out, as fast and as honestly as possible, whether the need is
real — and to tell them plainly if it is not.

## The product

**Singularity** is a marketplace for game-development source code with one
distinguishing mechanic: a developer publishes a code asset **once**, in one of
five languages (TypeScript, JavaScript, Java, C#, C++), together with a runnable
test suite. An LLM then translates the code *and its tests* into the other four
languages, runs each translated suite in a Docker sandbox, and lists for sale
only the variants whose tests pass. Buyers browse, see a per-language pass/fail
badge, and buy the variant matching their engine — delivered as a GitHub pull
request or a download. Payments run through Whop; the developer keeps 70%.

Translation is engine-aware: it converts coordinate systems (Y-up ↔ Z-up), unit
scales (meters ↔ centimeters), gravity constants, naming conventions, and engine
API calls between targets (e.g. Unity `Transform.Translate` → Godot
`Node3D.translate`).

The stated wedge: buyers never receive code that has not been compiled and
tested in their target language first. The stated beachhead: indie teams in the
Unity and Unreal ecosystems.

## What you are testing

Six hypotheses. Each has a **kill criterion** — a finding that, if true, means
the product as specified does not have a market. Treat each as a claim to be
falsified, not supported. Report the kill criterion's status explicitly for
every hypothesis, including the ones that survive.

**H1 — The porting pain is real and recurring.**
Working game developers port meaningful gameplay code across engines or
languages often enough to pay to avoid it.
*Kill:* cross-engine porting is rare, one-directional (a whole-project migration,
not a per-asset need), or already absorbed by rewriting from scratch because the
engine coupling dominates the logic anyway.

**H2 — Enough supply exists to stock the marketplace.**
The platform requires sellers to provide a **runnable, engine-independent test
suite** alongside the code. There is no path to publish without one.
*Kill:* the population of game developers who hold reusable gameplay code *and*
test it *and* would license it out is too small to stock a catalog. Look hard
here — gameplay code is notoriously untested, engine-coupled, and validated by
playtesting rather than assertions. **This bounds supply before demand matters,
so research it first.**

**H3 — Buyers will trust LLM-translated code in a shipped product.**
A green "tests passed" badge is sufficient to overcome hesitancy about
AI-translated code entering a commercial game.
*Kill:* developers report they would review or rewrite the translated output
anyway (destroying the time saving), or legal/IP and platform-certification concerns
about AI-generated code in shipped titles block adoption regardless of quality.

**H4 — Paid code assets are a live market, distinct from free alternatives.**
Developers currently pay for *scripting and systems* code, not just art, audio,
and models.
*Kill:* the paid asset market is overwhelmingly art/audio, and code needs are met
by free open-source (GitHub, Godot addons, Unity packages) — meaning the buyer
habit does not exist for this category.

**H5 — The price point can work.**
The platform's formula computes price from complexity and quality, capping at
**$3.50 per asset**, of which the platform keeps 25% (~$0.88).
*Kill:* either developers will not pay meaningfully more than $3.50 for a
verified cross-engine system (so the business cannot reach scale), or the
prevailing price for comparable assets is 10–50× higher (so the formula is
mispriced and signals worthlessness). Both are fatal to the current model, in
opposite directions — say which one the evidence supports.

**H6 — Generative AI is not already the substitute.**
This is the existential one. A developer who needs a pathfinding or inventory
system in C# can now ask an LLM to write one, in their engine, for roughly the
cost of a subscription they already hold.
*Kill:* practitioners report they already do this and consider the need met.
Address directly: **what does buying a verified $3.50 asset offer over prompting
a model you already pay for?** If the honest answer is "not much," say so — that
finding is worth more than the rest of the report combined.

## Evidence standards

Weight sources in this order. State which tier each material claim rests on.

1. **Practitioner voice** — r/gamedev, r/Unity3D, r/unrealengine, Unity and
   Unreal forums, GDC talks, Hacker News threads, game-dev Discords, developer
   blogs. People describing their actual workflow, unprompted. Highest value.
2. **Revealed behavior** — asset store listings, review counts, price
   distributions, download/sales figures, GitHub stars and forks on comparable
   free tooling, Steam/itch release data. What people *do*, not what they say.
3. **Industry data** — engine market share, developer population, studio counts,
   third-party marketplace reports.
4. **Vendor and analyst marketing** — lowest tier. Never let a vendor blog or a
   press-release TAM carry a conclusion on its own.

Hard rules:

- **Cite specifics.** Link or name every source. "Developers often say…" with no
  citation is not a finding.
- **Quote practitioners verbatim** where you can, especially when they contradict
  the thesis. Three real quotes beat a page of paraphrase.
- **Date every claim.** The AI-coding landscape moved fast; a 2023 attitude
  survey about AI-generated code may not describe 2026 behavior. Flag anything
  older than ~18 months as potentially stale.
- **Distinguish stated from revealed preference.** Survey enthusiasm for AI
  tooling and actual purchasing behavior are different variables.
- **No market-size theater.** If you give a TAM/SAM/SOM, you must also build a
  **bottom-up** estimate: developers who could plausibly buy × realistic
  purchases per year × realistic price. When the two disagree by an order of
  magnitude, say so and explain which you believe.
- **Report absence of evidence as a finding.** "I could not find developers
  discussing this problem" is a real and important result, not a gap to paper
  over.

## Competitive landscape to cover

At minimum: Unity Asset Store; **FAB** (Epic's unified marketplace, which
consolidated the Unreal Marketplace, Quixel, and Sketchfab); itch.io; CodeCanyon;
GitHub and the open-source ecosystem; Godot's asset library. Plus the substitute
that matters most — general-purpose AI coding tools (Claude Code, Copilot,
Cursor) used to generate or port gameplay code directly.

For each: what it sells, whether code/scripting is a meaningful share, price
bands, and whether anything already offers cross-engine or verified delivery.
Also search for **prior attempts at code translation marketplaces or automated
porting services, including failed ones** — a dead competitor is the single most
informative artifact you can find, so spend real effort here and report what
killed it.

## Deliverable

Structure the report exactly like this.

1. **Verdict** — one paragraph, up front. Is this a real need? Answer one of:
   *validated* / *validated but mispriced or mis-scoped* / *not validated* /
   *insufficient evidence*. No hedging preamble before the answer.
2. **Hypothesis scorecard** — a table: H1–H6, each marked
   SUPPORTED / MIXED / REFUTED / UNKNOWN, with the single strongest piece of
   evidence and your confidence (high/medium/low). Kill-criterion status stated
   for every row.
3. **Evidence by hypothesis** — the detail, cited, with practitioner quotes.
4. **Competitive map** — including any prior attempts and what happened to them.
5. **Market sizing** — top-down and bottom-up, reconciled.
6. **The strongest case against** — argue the disconfirming position at full
   strength, in its own section, as if you were paid to kill the project. If you
   cannot make this section compelling, you have not researched hard enough.
7. **What would change the answer** — the three cheapest experiments (each
   under two weeks) that would most reduce uncertainty. Be concrete: who to talk
   to, what to post where, what to measure, what result flips the verdict.
8. **Pivots worth considering** — only if the core thesis is weak. Adjacent
   framings the evidence *does* support (e.g. verification-as-a-service without
   the marketplace; a single high-value engine pair; internal studio tooling;
   non-game polyglot codebases). Say what evidence supports each.

Lead with what would disappoint the client. If the evidence is thin, say the
evidence is thin — do not manufacture confidence to fill the template.
