# Singularity

**Publish your game code once. Sell it, verified, in every language.**

Singularity is a marketplace for game-development code assets. A developer
uploads source code and its tests in one language; Singularity uses an LLM to
**translate** the asset into the other supported languages, **runs the
translated tests in a Docker sandbox**, and only lists the variants that
**actually pass**. Buyers purchase a tested variant in the language and engine
they already use — delivered as a GitHub pull request or a direct download.

> The core promise: **buyers never receive code that hasn't been compiled and
> tested in their target language first.**

| | |
| --- | --- |
| **Languages** | TypeScript · JavaScript · Java · C# · C++ |
| **Engines** | Unity, Unreal, Godot, MonoGame, libGDX, Phaser, Three.js, … |
| **Stack** | Next.js 15 · React 19 · Supabase · Claude · Docker · Whop |
| **Status** | MVP — runs out of the box in demo mode |

---

## Quick start (demo mode)

The app boots with **no external services** — seeded data, simulated
publish/purchase. This is the fastest way to see it.

```bash
corepack enable
pnpm install
pnpm dev          # http://localhost:3000
```

That's it. Browse the marketplace, open the publish wizard, walk a purchase —
all backed by fixtures in `src/lib/demo-data.ts`.

## Running the real backend

```bash
cp .env.local.example .env.local
# Fill in Supabase, Whop, GitHub App, and Anthropic values, then set:
#   NEXT_PUBLIC_REAL_BACKEND=true
#   SINGULARITY_REAL_BACKEND=true

supabase start && supabase db reset      # local Postgres + migrations
pnpm run worker:build-images             # build the 5 Docker test images

pnpm dev          # terminal 1 — Next.js app + API
pnpm worker       # terminal 2 — translation/verification worker
```

**Prerequisites for the real backend:** Node 20+, pnpm (via Corepack), Docker,
the Supabase CLI, a GitHub App, a Whop platform company + API key, and an
Anthropic API key.

---

## How it works

```
Developer publishes (1 language)
        │
        ▼
  assets row (status: verifying) + one asset_variant per language (queued)
        │
        ▼
  Worker:  claim → translate (Claude) → test in Docker → pass/fail
        │
        ▼
  Source variant passes → quality score computed → price set → status: published
        │
        ▼
  Marketplace shows per-language verification badges (✓ / ⏳ / ✗)
        │
        ▼
  Buyer purchases a passing variant → Whop payment → delivered as GitHub PR or download
```

Pricing is **computed**, not set by hand: a unit-economics formula combines the
asset's complexity tier with its verified quality score. Revenue splits
**70% developer / 25% platform / 5% referral reserve**.

---

## Project layout

```
src/app/        Next.js routes (pages + /api)
src/components/  React UI (publish wizard, marketplace, purchase, Whop/GitHub)
src/lib/         Supabase/GitHub/Whop clients, pricing, taxonomy, validation, search
src/types/       Generated Supabase types
worker/          Translation + Docker verification worker (+ per-language Dockerfiles)
supabase/        SQL migrations + seed
```

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Run the app (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm worker` | Run the translation worker |
| `pnpm run worker:build-images` | Build the 5 language Docker images |
| `pnpm run generate-types` | Regenerate `src/types/database.ts` from Supabase |

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — full codebase breakdown: architecture, flows,
  schema, conventions. Read this before contributing.
- **[INVESTOR.md](./INVESTOR.md)** — business model, market, unit economics, and
  a PRD/technical overview of the platform.

## Operational endpoints

`GET /api/health` (liveness) · `GET /api/ready` (readiness) ·
`GET /.well-known/security.txt` (disclosure contact).

---

## Contributing

1. Branch from the default branch.
2. Keep the **demo-mode branch first** in any API route or data loader.
3. Validate input with a Zod schema in `src/lib/validation.ts`.
4. Run `pnpm lint` and `pnpm exec tsc --noEmit` before pushing.
5. Commit with conventional prefixes (`feat:`, `fix:`, `docs:`, …).

## License

MIT (placeholder — to be finalized).
