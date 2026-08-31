# Market Research Findings — Is Singularity a Need?

**Date:** 2026-08-31 · **Method:** the brief in `docs/MARKET_RESEARCH_PROMPT.md`,
executed against public sources · **Researcher's posture:** adversarial, per that brief.

> **Evidence caveat, stated up front.** Several primary sources were unreachable
> from this environment (gdconf.com, gamedeveloper.com, codemetal.ai,
> strayspark.studio, darkounity.com all blocked; Reddit not fetchable). Findings
> below rest on search-engine extracts and secondary coverage. Where a figure is
> corroborated across independent outlets I mark it **high** confidence; where it
> rests on a single extract, **medium** or **low**. Nothing here substitutes for
> the primary-source interviews in §7 — this is desk research, and desk research
> is where you decide what to go ask people.

---

## 1. Verdict

**Not validated as specified.** The underlying technology thesis is real and
fundable — but the market Singularity points it at is the wrong one, and the
product is priced into a segment that generative AI has already taken.

Four of six hypotheses fail their kill criteria, and the two that fail hardest
are the two that were flagged as existential before research began. The
verification insight is genuinely valuable and there is documented, unmet buyer
pain it addresses. But it is aimed at indie game developers buying $3.50
scripting assets — a segment that (a) largely cannot supply tested code, (b) is
majority-hostile to AI-generated code, and (c) is watching the cheap end of the
asset market get absorbed by AI right now, according to publishers who sell
there. Meanwhile a company doing near-identical technology for safety-critical
industries raised $36.5M at a $250M valuation and is on contract for eight
figures of revenue.

The finding is not "this doesn't work." It is **"this works, and it is pointed
at the least valuable customer."**

---

## 2. Hypothesis scorecard

| # | Hypothesis | Verdict | Strongest evidence | Confidence |
|---|---|---|---|---|
| H1 | Cross-engine porting pain is real and recurring | **MIXED** | Unity's 2023 runtime fee drove a real engine exodus (Unreal 42% vs Unity 30% primary engine by 2026), but the standard advice for Unity→Unreal is *rewrite from scratch*, and Godot ports report shaders, physics and networking all needing rewrites regardless | Medium |
| H2 | Enough supply exists (reusable code **with tests**) | **REFUTED** | Unit testing is "not used that often by game developers"; the workaround — structuring gameplay as an engine-separate library — is precisely the rare discipline the platform requires | Medium |
| H3 | Buyers will trust LLM-translated code in shipped products | **REFUTED** | GDC 2026 (n>2,300): 52% say genAI harms the industry, up from 30% then 18%; only 7% positive. **Game programmers are 59% unfavorable.** 76% of developers don't fully trust AI code; only ~25% of seniors ship it unreviewed | High |
| H4 | Paid *code* assets are a live market distinct from free | **MIXED** | Unity editor tools are the **highest-earning** category at $15–80+ — paid code does sell. But general asset marketplaces are overwhelmingly art: GameDev Market has **no way to upload code at all**; ArtStation ~140,680 assets; CGTrader 1.5M models | Medium |
| H5 | The $3.50 price point can work | **REFUTED — both kill criteria fire at once** | The tools sweet spot is **$20–50**, and "an asset priced at $4.99 will be bought less than the same asset at $19.99 **because buyers assume it must be low effort**" | High |
| H6 | Generative AI is not already the substitute | **REFUTED** | An Asset Store publisher (Makaka Games): "Random sales to hobbyists will fade away, with most of their needs **already covered by AI**." The stated survival lane is **premium** content and paid support | Medium-High |

---

## 3. Evidence by hypothesis

### H1 — Porting pain: real, but not shaped like the product · MIXED

The demand event is real and recent. Unity's September 2023 runtime fee produced
a genuine exodus; by the 2026 State of the Game Industry survey Unreal was the
primary engine for **42%** of developers against Unity's **30%** — a reversal
that would have been implausible in 2023. MegaCrit rebuilt *Slay the Spire 2* on
Godot mid-development rather than wait it out. People do move engines.

But **how** they move is the problem. The recurring advice for Unity→Unreal is
to *rewrite from scratch rather than attempt a direct port*. Godot port
write-ups describe the same thing from the other side: custom shader graphs must
be **rebuilt, not copied**; Godot 4's Jolt-backed physics behaves differently
from PhysX; networking needs adaptation. One much-cited "Unity to Godot in a
weekend" success is the exception that proves the rule — it worked because the
developer had confined Unity-specific dependencies to **three source files**.
Another port took six months.

That is the kill criterion firing at half strength: engine coupling dominates,
and the logic that *is* cleanly portable is the logic that was already written
to be engine-agnostic. Which is a small, disciplined minority — and the same
minority H2 needs.

### H2 — Supply is the binding constraint · REFUTED

The platform cannot accept an asset without a runnable test suite
(`test_code: z.string().min(1)`, no bypass). This is architecturally correct and
commercially brutal.

Testing gameplay code is rare and structurally awkward. The reported obstacles
are consistent: proliferating state across game objects makes tests hard; no
graphics context should run during tests; developers question the ROI, saying
tests "rarely catch production issues" in practice. **Manual playthroughs and
hired testers are the real quality gate.** Where developers do test, the stated
technique is to structure gameplay "as a library separate from the game
engine" — exactly the engine-agnostic discipline that is uncommon enough to be
written up as a technique rather than assumed as a default.

So the seller population is not "game developers with reusable code." It is the
intersection of: has reusable gameplay code **and** tests it **and** wrote it
engine-independently **and** will license it out. Each filter is narrow and they
correlate imperfectly. §5 sizes this; the number is small enough to be a
business-model problem, not a marketing one.

### H3 — Trust: the buyer population is actively hostile · REFUTED

This is the most decisive and best-corroborated finding in the report.

GDC's 2026 State of the Game Industry survey (>2,300 professionals) found
**52% believe generative AI is having a negative impact on the industry** — up
from 30% the prior year and 18% the year before that. Positive sentiment fell to
**7%**, down from 13%. The trend is not softening with familiarity; it is
hardening.

And it is worst in precisely the buying population: **game programmers are 59%
unfavorable** (behind only visual/technical art at 64% and design/narrative at
63%). Separately, **76% of developers say they don't entirely trust AI-generated
code**, and only about a quarter of senior developers are confident enough to
ship it without review first.

The kill criterion was: *developers would review or rewrite the translated
output anyway, destroying the time saving.* That is the documented majority
behavior. Note the compounding problem — a buyer who reviews the translated code
must read an unfamiliar codebase in a language they may not know well, which is
plausibly slower than writing it themselves. And Steam now has AI disclosure
rules, which adds a shipping-side reason for caution that did not exist in 2023.

The honest counter: sentiment about *the industry* is not identical to
purchase behavior, and 52% negative still leaves a substantial minority.
Adoption is real — roughly 47–52% of studios report using genAI in production,
coding assistance being a top use. But those numbers cut for H6, not for H3:
developers are increasingly willing to use AI **themselves**, and increasingly
unwilling to trust AI output **from someone else**.

### H4 — Paid code sells, but not on general marketplaces · MIXED

The pro-thesis evidence is real: **editor tools are the highest-earning category
on the Unity Asset Store**, at $15–80+, with top sellers (Odin Inspector,
Rewired, DOTween Pro) reportedly making tens of thousands per month. Paid code
is not a fiction.

But the surrounding marketplaces are art businesses. **GameDev Market has no
mechanism to upload code assets at all.** ArtStation's marketplace is ~140,680
art products; CGTrader is 1.5M 3D models. FAB — Epic's consolidation of the
Unreal Marketplace, Quixel, Sketchfab and ArtStation Marketplace — passed
420,000 listings in 2025, but its identity is content, not code.

The signal: code sells when it is a **tool that saves a professional hours
repeatedly**, at a professional price, with support. It does not sell as
commodity snippets. Singularity's unit — a translated gameplay system at $3.50
with no support relationship — sits on the wrong side of that line.

**The one genuinely strong pro-Singularity finding is here.** Buyers get burned
by code assets and have little recourse: assets that don't work with unreachable
developers, Unity directing refund requests to the publisher, "the Asset Store
does not support a 'try before you buy'" policy, and at least one report of a
broken asset Unity declined to let the publisher fix ("We are not interested").
**Pre-purchase proof that code compiles and passes tests addresses a real,
documented, unsolved pain.** That insight is worth keeping. It is the best thing
in this product.

### H5 — The price is below the credibility floor · REFUTED, twice

The brief specified two opposite kill criteria and asked which fired. **Both do.**

The tools price band is **$20–50**, with editor tools reaching $80+. Against a
$3.50 ceiling, Singularity is 6–20× under market. That alone caps the business.

Worse is the second-order effect, which practitioner guidance states directly:
**"an asset priced at $4.99 will be bought less than the same asset at $19.99
because buyers assume it must be low effort."** Price is a quality signal in
this market. A $3.50 price tag on a verified, cross-engine combat system does
not read as a bargain — it reads as junk. The pricing formula is not merely
leaving money on the table; it is **actively signalling that the asset is
worthless**, undermining the verification claim the entire product is built to
support.

This compounds with `docs/AUDIT.md` §3: at $0.88 platform revenue per sale
against four Opus-tier translation calls per publish, the platform needs
multiple sales per asset just to recover listing cost.

### H6 — AI has already taken this exact segment · REFUTED

The most damaging single piece of evidence is not a survey. It is a Unity Asset
Store publisher describing his own market: **"Random sales to hobbyists will
fade away, with most of their needs already covered by AI"** — naming free tools
and GPTs generating code specifically — with the stated survival lane being
**"Premium Content only, with paid support"**: editor tools, complete projects,
paid support.

That is revealed behavior from someone whose income depends on reading it
correctly, and it maps onto Singularity's position with unfortunate precision.
Singularity sells non-premium code units at $3.50 with no support relationship,
to hobbyists and small indies. That is the exact segment named as evaporating.

There is one real counterpoint, and it deserves weight: a 2025 Unity user survey
reportedly found that developers **who use AI ended up spending *more* on the
Asset Store**, not less. If that holds, AI is expanding project ambition and
pulling demand upward rather than substituting for purchases. But read alongside
the publisher testimony, the most coherent reading is a **barbell**: AI absorbs
the cheap commodity end, while premium tools and complete projects grow. A
$3.50 price point puts Singularity at the end that is disappearing.

---

## 4. Competitive map

| Player | What it is | Relevance |
|---|---|---|
| **Code Metal** | **"Verifiable code translation."** $36.5M Series A led by Accel at a $250M valuation (after $16.5M seed; later reporting cites $125M). Investors include RTX Ventures and Bosch Ventures. Deployed in **defense, automotive, semiconductor**; on contract for eight figures of revenue. Integrates **formal methods** with AI so translated code is "optimized, tested, compliant" for safety-critical deployment | **The most important finding in this report.** Near-identical technical thesis, independently validated by top-tier investors — but sold as an enterprise service to safety-critical industries, not a marketplace to indies, and verified with formal methods rather than test-passing. It is simultaneously proof the technology matters and proof that Singularity's chosen market is the low-value one |
| **Unity Asset Store** | 70/30 split (same developer share Singularity offers); editor tools the top-earning category at $15–80+; documented refund and abandonment problems; being rebuilt in 2026 | The incumbent, and the source of the pain verification would solve |
| **FAB (Epic)** | Unified Unreal Marketplace + Quixel + Sketchfab + ArtStation Marketplace, launched Oct 2024; 420,000+ listings by end of 2025 | Consolidation reduces the "fragmented marketplaces" opening |
| **GameDev Market / ArtStation / CGTrader** | Art and audio marketplaces | **GameDev Market cannot accept code at all** — evidence the category is art-shaped |
| **Haxe** | Mature cross-platform language that transpiles to many targets; used by Nickelodeon, Disney, Motion-Twin | **The closest prior art, and a cautionary tale.** Solves cross-language reuse *properly*, at the language level, and still never went mainstream — cited reasons: no big-company backing, and stack-wide debugging burden. Cross-language game code reuse has been technically solved for years and the market did not take it |
| **General AI coding tools** | Claude Code, Copilot, Cursor | The substitute per H6 |
| **Engine-agnostic library pattern** | The established best practice: gameplay in a library with no engine references, accessed through interfaces | The free, incumbent alternative — and it is what a developer capable of supplying Singularity has usually already done |

**Prior attempts.** No dead cross-engine *code marketplace* surfaced, which is
itself informative — this specific business does not appear to have been tried
and killed; it appears not to have been tried. But the adjacent graveyard is
instructive: automated porting has been commercially attempted repeatedly
(AWS Porting Assistant for .NET, CodePorting, Tangible's converters) and has
consistently landed as **enterprise tooling or professional services**, never as
a self-serve marketplace. Haxe is the cleanest natural experiment: the problem
was solved, well, and adoption still did not follow.

---

## 5. Market sizing — top-down vs bottom-up

**Top-down (the data room's figures):** TAM $522B (general software development),
SAM $141.5B (game development), SOM $1.31B (indie scripting beachhead).

These are industry-output figures, not addressable-spend figures. The game
industry's $141.5B is overwhelmingly *consumer spending on games* — money that
never touches a developer-tools marketplace. Using it as a SAM for a code
marketplace is a category error.

**Bottom-up (supply-constrained, which is the binding side):**

| Step | Estimate | Basis |
|---|---|---|
| Game developers worldwide | ~11.1M | SlashData, incl. hobbyists and students |
| Active commercial engine developers | ~2.5M | Unity ~2M monthly active + Unreal share |
| Hold a reusable, self-contained gameplay system worth selling | ~15% → 375,000 | Judgement |
| …that has a runnable, **engine-independent** test suite | ~5% → 18,750 | Generous, given H2 |
| …and will license it out | ~10% → **~1,900 potential sellers** | Judgement |
| At ~2 assets each | **~3,800 listable assets** | |

Demand side at the shipped price: 3,800 assets × 25 sales/year × $3.50 =
**~$333K GMV/year**, of which the platform's 25% is **~$83K/year**. That is not
a venture business; it is barely a salary.

**Reconciling the two.** To reach the claimed $1.31B SOM at $3.50 per
transaction requires **374 million transactions per year** — about **34
purchases annually from every game developer on Earth, including hobbyists and
students.** At a corrected $35 price it still requires 37.4M transactions, or
~3.4 per developer per year, globally, universally. Both are impossible.

The top-down and bottom-up numbers disagree by roughly **four orders of
magnitude**, and the bottom-up number is the believable one. Fixing price alone
moves the ceiling to a few million dollars of GMV — a real business, but a
different one from the memo's.

---

## 6. The strongest case against

Argued at full strength, as the brief requires:

Singularity requires a seller to have done something rare (write reusable
gameplay logic), then something rarer (test it), then something rarer still
(test it engine-independently), and then to license it for **$2.45 net**. The
supply side is a rounding error, and no amount of demand-side marketing fixes a
catalog that cannot be stocked.

On the demand side it asks a population that is **59% unfavorable to generative
AI** to buy AI-translated code, on the strength of a badge that — per
`docs/AUDIT.md` §2 — attests self-consistency rather than semantic equivalence,
because the tests are translated by the same model call as the code. Academic
work on code translation makes the same point independently: test-passing
metrics diverge from semantic correctness, which is why the research field keeps
building better execution-based benchmarks. The one buyer who reads the
verification claim carefully is the one most likely to reject it.

And the timing is adverse. The cheap end of the asset market is being absorbed
by AI *now*, by the testimony of publishers who sell there. Singularity enters
that end, at a price that signals low effort, with no support relationship — the
one thing publishers name as part of the survival lane.

The final blow is that the technology is not the moat. Code Metal raised $36.5M
at a $250M valuation for the same core idea, executed with formal methods rather
than self-referential tests, sold to industries where a translation bug costs
lives and budgets are correspondingly large. If verified translation is
valuable, the value is concentrated where correctness is expensive — and games
are where correctness is *cheapest*. A wrong gravity constant in an indie
platformer is a bug report. In an automotive ECU it is a recall.

**A marketplace is also the hardest possible go-to-market for this technology:**
it requires solving supply and demand simultaneously, in a segment with no
budget, against a free substitute, with a trust story the audience is
predisposed to reject.

---

## 7. What would change the answer — three experiments, each under two weeks

Ranked by how much uncertainty they remove per day spent. Run **E1 first**; if
it fails, the others are moot.

**E1 — Can the catalog be stocked? (supply, 3–5 days, ~$0)**
Find 30 open-source Unity/Godot/libGDX gameplay repositories with permissive
licenses. For each, record: is there a test suite? Does it run without the
engine? How many assertions? This directly measures H2's filter rate on real
code rather than judgement.
*Flips the verdict if:* >20% have runnable engine-independent suites. *Confirms
refutation if:* <5%. Then message 15 authors asking whether they'd license the
module. Zero replies is also a finding.

**E2 — Does the badge survive contact with a skeptic? (trust + verification, 5 days)**
Take three real assets through the existing pipeline. Then **manually diff the
translated tests against the originals** and count how many assertions were
weakened, dropped, or had their expected values altered. This measures the §2
gap with your own product rather than arguing about it.
*Flips the verdict if:* assertions are preserved at high fidelity — you have a
much stronger claim than this report credits. *Confirms refutation if:* drift is
common — the badge cannot bear the weight the pitch puts on it, and fixing that
is the whole roadmap.

**E3 — Will anyone pay, and how much? (demand + price, 10 days, ~$100)**
Post one genuinely useful verified cross-engine system publicly (r/gamedev,
r/Unity3D, itch.io) at **$29**, not $3.50 — the evidence says the low price
suppresses demand rather than driving it. Measure clicks→purchases. In parallel,
ask 10 developers the H6 question directly: *"You need an inventory system in
C#. Do you buy this for $29, or prompt Claude?"*
*Flips the verdict if:* people buy, and the stated reason is the verification.
*Confirms refutation if:* the modal answer is "I'd just prompt it."

---

## 8. Pivots the evidence actually supports

The core thesis is weak, so per the brief, here is where the evidence points
instead. Each is stated with the finding that supports it.

1. **Verification-as-a-service, no marketplace.** The strongest validated pain
   in this research is H4's: buyers get burned by broken code assets with no
   recourse, on marketplaces that will not refund them. Sell *verification* to
   existing marketplaces and their publishers — "this asset compiles and passes
   its suite on Unity 6 / UE 5.5" — instead of building a competing catalog.
   Removes the supply constraint entirely (assets already exist), removes the
   trust problem (nothing is AI-translated; you are only *checking*), and
   removes the price ceiling. This is the strongest option on the board.

2. **Follow Code Metal's market, not its product.** Verified translation is
   demonstrably fundable where correctness is expensive: defense, automotive,
   medical, industrial, semiconductor. Code Metal is well ahead with formal
   methods and a defense-adjacent cap table, so entering head-on is unwise —
   but the finding is that **the value of verified translation scales with the
   cost of being wrong**, and games are the floor of that scale.

3. **One high-value engine pair, sold as a service.** If games stay the market,
   the evidence says the money is in **premium tools with support** ($20–80+),
   not $3.50 units. A focused Unity→Godot or Unity→Unreal migration *service*,
   priced per project, rides the documented engine exodus that H1 confirms is
   real, and prices where the market actually pays.

4. **Internal studio tooling.** A studio maintaining one game across engines has
   the tested, engine-independent code the public market lacks, plus a real
   budget. Same technology, supply problem solved by the customer.

**What to keep in all four:** the verification insight. It is the part of this
product that research validates. The marketplace wrapper, the $3.50 price, and
the indie-game beachhead are what the evidence rejects.

---

## Sources

- GDC 2026 State of the Game Industry (via [80.lv](https://80.lv/articles/gdc-survey-over-50-of-game-devs-say-generative-ai-harms-industry), [This Week In Video Games](https://thisweekinvideogames.com/news/gdc-state-of-the-game-industry-survey-2026-generative-ai-unionisation-us-immigration-policy/), [GIANTY](https://www.gianty.com/gdc-2026-report-about-generative-ai/), [GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/))
- [Code Metal Series A — PR Newswire](https://www.prnewswire.com/news-releases/code-metal-raises-36-5-million-for-verifiable-ai-powered-code-translation-302613568.html) · [Pulse2](https://pulse2.com/code-metal-36-5-million-series-a-raised-to-advance-verifiable-ai-code-translation/) · [B Capital](https://b.capital/why-we-invested/translating-code-when-failure-is-not-an-option-why-we-invested-in-code-metal/) · [Ventureburn](https://ventureburn.com/code-metal-secures-125m/)
- [Is the Unity Asset Store Dying? (Makaka Games publisher commentary)](https://darkounity.com/blog/is-the-unity-asset-store-dying)
- [Unity Asset Store selling & revenue guide](https://generalistprogrammer.com/tutorials/unity-asset-store-selling-guide-revenue) · [Unity Asset Store payouts docs](https://docs.unity3d.com/6000.3/Documentation/Manual/AssetStorePayouts.html)
- [From Unity to Godot in a Weekend](https://www.gamedeveloper.com/programming/from-unity-to-godot-in-a-weekend) · [Sigil of Kings Unity→Godot port devlog](https://byte-arcane.itch.io/sigil-of-kings/devlog/701930/unity-to-godot-port-complete) · [Guide to porting Unity→Godot](https://ilogos.biz/guide-to-game-porting-from-unity/)
- [Kotaku — devs react to Unity runtime fee](https://kotaku.com/unity-engine-subscription-cost-unreal-godot-indie-dev-1850831032) · [Unreal vs Unity vs Godot 2026](https://shattered.io/unreal-engine-vs-unity-vs-godot/)
- [Is AI Code Actually BAD? — GameDev.net](https://gamedev.net/news/ls-ai-code-actually-bad-r4686/) · [AI boosts code speed and quality, yet doubts persist — eMarketer](https://www.emarketer.com/content/ai-boosts-code-speed-quality-doubts-persist)
- [Opinion: Separation of Gameplay — Game Developer](https://www.gamedeveloper.com/design/opinion-separation-of-gameplay) · [Haxe adoption discussion — Hacker News](https://news.ycombinator.com/item?id=13305617) · [Haxe for games](https://haxe.org/use-cases/games/)
- [Fab launch — Epic Games](https://www.epicgames.com/site/news/fab-epics-new-unified-content-marketplace-launches-today) · [Fab 12-month seller retrospective](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026) · [GameDev Market](https://www.gamedevmarket.net/) · [Game asset stores guide](https://generalistprogrammer.com/tutorials/game-asset-stores-complete-marketplace-guide-2025)
- [Unity Asset Store refunds — Unity Discussions](https://discussions.unity.com/t/refund-from-asset-store/536593) · [Refunding customers — Unity docs](https://docs.unity3d.com/2020.1/Documentation/Manual/AssetStoreRefunding.html)
- [Game development statistics 2026 — VoxBooster](https://voxbooster.com/blog/game-development-statistics-2026/) · [How many game developers worldwide — Qubit Labs](https://qubit-labs.com/how-many-game-developers-are-there-in-the-world-surprising-statistics/)
- Code-translation evaluation research: [Beyond BLEU: semantic evaluation for code translation](https://arxiv.org/pdf/2605.05282) · [ExeCoder](https://arxiv.org/abs/2501.18460) · [RepoTransBench](https://arxiv.org/pdf/2412.17744)
