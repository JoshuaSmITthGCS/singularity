# Singularity MVP

Singularity is a marketplace for tested code assets. Developers publish source code and tests, the worker verifies the original asset, and buyers can procure checked TypeScript, JavaScript, and Java variants.

By default the MVP runs in demo mode with seeded data and simulated publish/procurement actions. Set `NEXT_PUBLIC_REAL_BACKEND=true` and `SINGULARITY_REAL_BACKEND=true` to use Supabase, GitHub, and worker-backed flows.

## Documentation

- **Quick Start**: This README (you are here)
- **Complete Guide**: [CLAUDE.md](./CLAUDE.md) - Comprehensive project documentation
- **Netlify Deployment**: [NETLIFY_FIXES.md](./NETLIFY_FIXES.md) - Deployment troubleshooting
- **Production Setup**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- **Pitch Deck**: [PITCH_DECK.md](./PITCH_DECK.md) - Investor presentation
- **Quick Reference**: [QUICK_START.md](./QUICK_START.md) - One-page cheat sheet
- **Build Spec**: [BUILD_PROMPT.md](./BUILD_PROMPT.md) - Technical requirements

## Prerequisites

- Node 20 or newer
- pnpm via Corepack
- Docker Desktop
- Supabase CLI
- A GitHub App
- An OpenAI API key

## Local Setup

```bash
corepack enable
pnpm install
cp .env.local.example .env.local
supabase start
supabase db reset
pnpm run worker:build-images
pnpm dev
pnpm worker
```

Run `pnpm dev` and `pnpm worker` in separate terminals. Supabase Studio runs at `http://localhost:54323`.

## Environment

Fill in `.env.local` after copying `.env.local.example`.

### Supabase

After `supabase start`, copy these values from the CLI output:

- `NEXT_PUBLIC_SUPABASE_URL`: local API URL, usually `http://localhost:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: local anon key
- `SUPABASE_SERVICE_ROLE_KEY`: local service role key for API delivery and the worker

### OpenAI

- `OPENAI_API_KEY`: key used by the worker for cross-language adaptation
- `OPENAI_MODEL`: optional model override; defaults to `gpt-5.5`

### GitHub App

Create a GitHub App at `https://github.com/settings/apps/new`.

Use these settings:

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:54321/auth/v1/callback`
- Setup URL: `http://localhost:3000/dashboard`
- Webhook URL: `http://localhost:3000/api/webhooks/github`
- Webhook secret: any strong random string
- Repository permissions: Contents read/write, Pull requests read/write, Metadata read-only
- Account permissions: Email read-only is enough for auth metadata
- Subscribe to installation events if webhooks are enabled

Then set:

- `GITHUB_APP_ID`: App ID from the app settings page
- `GITHUB_APP_SLUG`: slug from the public app URL, for example `my-singularity-app`
- `GITHUB_APP_INSTALL_URL`: optional full install URL if you do not want to use the slug
- `GITHUB_APP_CLIENT_ID`: Client ID from the app settings page
- `GITHUB_APP_CLIENT_SECRET`: generated client secret
- `GITHUB_APP_PRIVATE_KEY`: private key contents with newlines escaped as `\n`
- `GITHUB_APP_WEBHOOK_SECRET`: the webhook secret you chose

In Supabase Studio, enable GitHub under Authentication providers and use the same GitHub App client ID and secret.

## Worker Images

Build the sandbox images before running adaptations:

```bash
pnpm run worker:build-images
```

The worker uses:

- `singularity-node-runner`
- `singularity-typescript-runner`
- `singularity-java-runner`

## Scripts

- `pnpm dev`: Next.js app on `http://localhost:3000`
- `pnpm build`: production build
- `pnpm lint`: ESLint
- `pnpm worker`: adaptation and test worker
- `pnpm worker:build-images`: Docker sandbox images
- `pnpm run generate-types`: regenerate Supabase types from local DB

## MVP Flow

1. Developer signs in with GitHub.
2. Developer installs the GitHub App or uses paste mode.
3. Developer publishes source and tests with a public summary and price.
4. Worker claims the queued variants, adapts non-source languages, and runs Docker tests.
5. Marketplace lists the asset after the source-language checks pass.
6. Buyer selects a green target and chooses download or GitHub PR delivery.
7. Procurement is marked delivered and developer earnings are recorded.

## Production Deployment

This MVP is configured for **Netlify** deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Netlify configuration and environment variables
- Supabase hosted setup
- Worker deployment options (Railway, Render, Fly.io)
- Production checklist and monitoring

Note: The worker requires Docker and cannot run on Netlify. Deploy it separately on Railway, Render, or similar Docker-supporting platforms.
