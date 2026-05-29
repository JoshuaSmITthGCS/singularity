# Singularity - AI-Powered Multi-Language Code Marketplace

## Project Overview

**Singularity** is a revolutionary marketplace where developers publish code once and sell verified translations across Python, JavaScript, and TypeScript. Using OpenAI for semantic translation and Docker for secure testing, we ensure buyers receive only quality-guaranteed code.

### Core Value Proposition

- **For Developers**: Publish once in your language, earn from all three language ecosystems (Python, JavaScript, TypeScript)
- **For Buyers**: Purchase pre-tested code in your preferred language with confidence
- **For the Market**: First verified multi-language code marketplace with AI translation

---

## Architecture Overview

### Technology Stack

**Frontend & API**:
- Next.js 15 (App Router, React 19, TypeScript)
- Tailwind CSS 4 + shadcn/ui components
- Deployed on Netlify (serverless functions)

**Database & Auth**:
- Supabase (PostgreSQL + Auth + RLS)
- Row-Level Security for privacy
- GitHub OAuth provider

**AI Translation**:
- OpenAI GPT-5.5
- Semantic code translation (preserves logic, adapts idioms)
- Dependency detection and adaptation

**Test Execution**:
- Docker sandboxes (isolated, network-off, resource-limited)
- Custom images for Python, Node.js, TypeScript
- Two-stage execution: install → test

**Background Worker**:
- Long-running Node.js process
- Polls database for translation jobs
- Deployed separately (Railway/Render/Fly.io)
- Uses `SKIP LOCKED` for concurrent job processing

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│              (React App via Netlify CDN)                     │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├──→ Netlify Functions (Next.js API Routes)
              │    ├─ /api/assets (CRUD)
              │    ├─ /api/procurements (purchases)
              │    ├─ /api/github/* (repo/file access)
              │    └─ /api/webhooks/github (installations)
              │
              ├──→ Supabase (Hosted)
              │    ├─ PostgreSQL Database
              │    ├─ Auth (GitHub OAuth)
              │    ├─ Row-Level Security
              │    └─ Realtime (future)
              │
              └──→ Railway/Render (Worker)
                   ├─ Translation Service (OpenAI API)
                   ├─ Docker Test Runner
                   └─ Job Queue Processor

┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
├─────────────────────────────────────────────────────────────┤
│  • OpenAI Responses API (translation)                     │
│  • GitHub API (repo/PR operations)                           │
│  • Stripe (payments - Phase 5)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

**profiles**:
- User profile with GitHub metadata
- Installation ID for GitHub App
- Total earnings tracking

**repos**:
- Connected GitHub repositories
- Linked to owner profile

**assets**:
- Published code assets
- Source code + tests (private until purchase)
- Public summary + metadata
- Status: draft → verifying → published

**asset_variants**:
- One row per asset per language (3 total)
- Translation results (code, tests, notes)
- Test results (total/passed/failed)
- Status: queued → translating → testing → passed/failed
- Worker claim fields for job locking

**procurements**:
- Purchase records
- Links client, asset, variant
- Delivery method (GitHub PR or download)
- Status tracking

**payments**:
- Developer earnings bookkeeping
- 80/20 split (developer/platform)

### Key Design Patterns

1. **Pre-Translation**: All variants created at publish time, tested before marketplace listing
2. **RLS Privacy**: Source code visible only to developer OR buyer after purchase
3. **Job Locking**: `FOR UPDATE SKIP LOCKED` prevents duplicate work
4. **Public Views**: `marketplace_assets` and `marketplace_variants` hide sensitive fields

---

## How It Works

### 1. Publishing Flow

**Step 1: Developer uploads code**
```
Developer → /publish page
  ├─ Option A: Connect GitHub repo (select source + test files)
  └─ Option B: Paste code directly (source + tests)
```

**Step 2: Metadata entry**
- Title, description, summary (public preview)
- Tags for discoverability
- Price ($5-500)

**Step 3: Asset creation**
```sql
INSERT INTO assets (developer_id, source_code, test_code, status='verifying', ...)
INSERT INTO asset_variants (asset_id, target_language='python', status='queued')
INSERT INTO asset_variants (asset_id, target_language='javascript', status='queued')
INSERT INTO asset_variants (asset_id, target_language='typescript', status='queued')
```

### 2. Translation & Testing Flow

**Worker loop** (runs every 5 seconds):
```typescript
while (true) {
  // Claim next job with row-level locking
  const variant = await claimNextVariant()

  if (!variant) {
    await sleep(5000)
    continue
  }

  // Load parent asset
  const asset = await getAsset(variant.asset_id)

  // Translate (or skip if source language matches)
  if (variant.target_language === asset.source_language) {
    // Use source code as-is
    variant.translated_code = asset.source_code
    variant.translated_tests = asset.test_code
  } else {
    // Call OpenAI for translation
    const result = await translateCode({
      sourceCode: asset.source_code,
      sourceTests: asset.test_code,
      sourceLanguage: asset.source_language,
      targetLanguage: variant.target_language,
    })

    variant.translated_code = result.code
    variant.translated_tests = result.tests
    variant.notes_for_pr = result.notes
    variant.confidence = result.confidence
  }

  // Run tests in Docker sandbox
  const testResult = await runTests({
    language: variant.target_language,
    code: variant.translated_code,
    tests: variant.translated_tests,
    dependencies: result.dependencies,
  })

  // Update variant status
  variant.status = testResult.allPassed ? 'passed' : 'failed'
  variant.tests_total = testResult.total
  variant.tests_passed = testResult.passed
  variant.tests_failed = testResult.failed
  await updateVariant(variant)

  // If source language variant passed, publish asset
  if (variant.target_language === asset.source_language && variant.status === 'passed') {
    await updateAsset(asset.id, { status: 'published' })
  }
}
```

**Docker Test Execution**:

Stage 1: Install (if dependencies present)
```bash
# Network ON, 30s timeout, 256MB RAM
pip install -r requirements.txt  # Python
pnpm install                      # JS/TS
```

Stage 2: Test (always)
```bash
# Network OFF, 60s timeout, 512MB RAM, read-only filesystem
pytest --json-report              # Python
vitest --reporter=json            # JS/TS
```

### 3. Marketplace Flow

**Buyer browses**:
- `/marketplace` - grid of published assets
- Filter by language, tags, price
- Each card shows 3 language badges (✓ green, ⏳ yellow, ✗ red)

**Asset detail page**:
- Summary + description (code hidden)
- Language selector with test status
- "Buy" button enabled only for green variants
- Price displayed

**Purchase flow**:
```typescript
POST /api/procurements
{
  asset_id: 'uuid',
  variant_id: 'uuid',
  delivery_method: 'github_pr' | 'download',
  target_repo_full_name: 'owner/repo' // if github_pr
}

// Server:
1. Validate variant is 'passed'
2. Create procurement record
3. Execute delivery:
   - github_pr: Create PR with translated code + notes
   - download: Mark delivered (RLS grants code access)
4. Update developer earnings
5. Create payment record
```

### 4. Delivery Methods

**GitHub PR**:
- Opens PR in buyer's repo
- Includes translated code + tests
- PR body has adaptation notes
- Buyer reviews and merges

**Download**:
- Procurement page shows translated code
- Copy to clipboard or download as file
- Buyer integrates manually

---

## Deployment Guide

### Local Development

**Prerequisites**:
```bash
Node 20+
pnpm (via corepack)
Docker Desktop
Supabase CLI
GitHub App (create at github.com/settings/apps/new)
OpenAI API key
```

**Setup**:
```bash
# Install dependencies
corepack enable
pnpm install

# Configure environment
cp .env.local.example .env.local
# Fill in all required env vars (see .env.local.example)

# Start Supabase locally
supabase start
supabase db reset

# Build Docker test images
pnpm run worker:build-images

# Start dev servers (2 terminals)
pnpm dev      # Next.js on :3000
pnpm worker   # Translation worker
```

**Access**:
- App: http://localhost:3000
- Supabase Studio: http://localhost:54323

### Production Deployment

#### Option 1: Netlify + Railway (Recommended)

**Netlify** (Next.js app + API):
1. Connect GitHub repo
2. Build command: `pnpm build`
3. Publish directory: `.next`
4. Add environment variables (see .env.local.example)
5. Deploy

**Railway** (Worker):
1. Create new project
2. Connect repository
3. Root directory: `worker`
4. Build command: `pnpm install && pnpm run build:images`
5. Start command: `pnpm dev`
6. Add environment variables
7. Deploy

**Supabase**:
1. Create hosted project at supabase.com
2. Run migrations: `supabase db push --linked`
3. Configure Auth provider (GitHub)
4. Update env vars in Netlify + Railway

**GitHub App**:
- Update URLs to production domains
- Webhook URL: `https://your-app.netlify.app/api/webhooks/github`
- Callback URL: `https://your-project.supabase.co/auth/v1/callback`

#### Option 2: Vercel + Render

Same pattern as above, replace Netlify with Vercel, Railway with Render.

#### Option 3: Self-Hosted (Advanced)

- VPS with Docker support
- Nginx reverse proxy
- PM2 for Next.js + Worker
- PostgreSQL database
- GitHub App + OpenAI API configured

---

## Environment Variables

### Required (Frontend + API)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=my-singularity-app
GITHUB_APP_CLIENT_ID=Iv1.abc123def456
GITHUB_APP_CLIENT_SECRET=abc123def456...
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...\n-----END RSA PRIVATE KEY-----
GITHUB_APP_WEBHOOK_SECRET=your-random-secret

# App Config
NEXT_PUBLIC_APP_URL=https://singularity.app
```

### Required (Worker Only)

```bash
# All of the above PLUS:
WORKER_ID=worker-railway-1
WORKER_POLL_INTERVAL_MS=5000
WORKER_CLAIM_TIMEOUT_MINUTES=10
```

### Optional (Phase 5)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## API Reference

### Public Routes

**GET /marketplace**
- Browse published assets
- No auth required

**GET /marketplace/[assetId]**
- Asset detail page
- Shows summary (code hidden until purchase)

### Authenticated Routes

**POST /api/assets**
- Create new asset
- Body: `{ source_type, source_language, title, description, summary, tags, source_code, test_code, price_cents, repo_id?, source_path?, test_path? }`
- Returns: `{ data: asset, error?: string }`

**GET /api/github/repos**
- List user's accessible repos
- Requires GitHub App installation

**GET /api/github/files?repo=owner/repo&path=/src**
- List files in repo path
- Requires GitHub App installation

**POST /api/procurements**
- Create procurement (purchase)
- Body: `{ asset_id, variant_id, delivery_method, target_repo_full_name? }`
- Executes delivery inline
- Returns: `{ data: procurement, error?: string }`

**GET /dashboard**
- User dashboard
- Shows assets, procurements, earnings

**GET /procurements/[id]**
- Procurement detail
- Shows code if delivered + download mode

### Webhooks

**POST /api/webhooks/github**
- GitHub App installation events
- Signature verified
- Updates profile.github_installation_id

---

## Key Files & Structure

```
singularity/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   ├── error.tsx                 # Error boundary
│   │   ├── marketplace/              # Browse & detail pages
│   │   ├── publish/                  # Asset creation wizard
│   │   ├── dashboard/                # User dashboard
│   │   ├── procurements/             # Purchase history & downloads
│   │   └── api/                      # API routes (serverless)
│   │       ├── assets/               # CRUD for assets
│   │       ├── procurements/         # Purchase endpoint
│   │       ├── github/               # GitHub integration
│   │       └── webhooks/             # GitHub webhooks
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── AssetCard.tsx             # Marketplace asset card
│   │   ├── PublishForm.tsx           # Publish wizard form
│   │   ├── PurchaseForm.tsx          # Purchase flow
│   │   ├── LanguageBadge.tsx         # Test status badges
│   │   └── SiteHeader.tsx            # Navigation
│   │
│   ├── lib/                          # Utilities & clients
│   │   ├── supabase/                 # Supabase clients
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client (SSR)
│   │   │   ├── admin.ts              # Service role client
│   │   │   └── middleware.ts         # Auth middleware
│   │   ├── github/                   # GitHub App integration
│   │   │   ├── app.ts                # App auth
│   │   │   └── octokit.ts            # API client
│   │   ├── marketplace/              # Marketplace queries
│   │   ├── procurements/             # Delivery logic
│   │   ├── validation.ts             # Zod schemas
│   │   ├── constants.ts              # App constants
│   │   ├── utils.ts                  # Helper functions
│   │   └── env-validation.ts         # Env var checks
│   │
│   └── types/                        # TypeScript types
│       └── database.ts               # Supabase generated types
│
├── worker/                           # Background translation worker
│   ├── src/
│   │   ├── index.ts                  # Main loop
│   │   ├── claim.ts                  # Job claiming logic
│   │   ├── translator.ts             # OpenAI API client
│   │   ├── test-runner.ts            # Docker test execution
│   │   ├── db.ts                     # Supabase client
│   │   └── config.ts                 # Worker config
│   │
│   ├── docker/                       # Sandbox Dockerfiles
│   │   ├── python.Dockerfile         # Python 3.12 + pytest
│   │   ├── node.Dockerfile           # Node 20 + vitest
│   │   └── typescript.Dockerfile     # Node 20 + tsx + vitest
│   │
│   └── package.json                  # Worker dependencies
│
├── supabase/                         # Database migrations
│   ├── config.toml                   # Supabase config
│   ├── migrations/
│   │   ├── 20260101000000_initial_schema.sql
│   │   └── 20260101000001_rls_policies.sql
│   └── seed.sql                      # Dev seed data
│
├── public/                           # Static assets
├── netlify.toml                      # Netlify config
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── pnpm-workspace.yaml               # Workspace config
├── .env.local.example                # Environment template
│
└── Documentation/
    ├── README.md                     # Quick start
    ├── DEPLOYMENT.md                 # Production deployment
    ├── PITCH_DECK.md                 # Investor pitch
    ├── QUICK_START.md                # One-page reference
    ├── BUILD_PROMPT.md               # Technical spec
    └── CLAUDE.md                     # This file
```

---

## Security & Privacy

### Row-Level Security (RLS)

**Profiles**:
- Users read/update only their own profile

**Assets**:
- Developers: full CRUD on their assets
- Buyers: read full asset ONLY after delivered procurement
- Public: read via `marketplace_assets` view (code hidden)

**Variants**:
- Developers: full access to their asset's variants
- Buyers: read variant ONLY after delivered procurement
- Public: read test status via `marketplace_variants` view

**Procurements**:
- Participants (client OR developer) can read
- Clients can create (purchase)

### Code Privacy

- Source code encrypted at rest in database
- Never exposed in marketplace listings
- Accessible only to:
  1. Developer (always)
  2. Buyer (after procurement delivered)
  3. Worker (service role for translation)

### Docker Sandbox Security

- **Network isolation**: `NetworkMode: 'none'` during test execution
- **Read-only filesystem**: `/workspace` mounted read-only
- **Resource limits**: 512MB RAM, 1 CPU, 60s timeout
- **Non-root user**: Tests run as unprivileged user
- **Ephemeral containers**: Destroyed after each test

### GitHub App Security

- **Minimum permissions**: Contents (read/write), Pull requests (read/write), Metadata (read)
- **Webhook signatures**: HMAC validation on all webhook events
- **Installation scoping**: Only selected repos accessible
- **Private key**: Stored as env var, never committed

### API Security

- **Authentication**: Supabase JWT on protected routes
- **Input validation**: Zod schemas on all inputs
- **Rate limiting**: TBD (Netlify provides basic protection)
- **CORS**: Configured for same-origin only

---

## Testing Strategy

### Unit Tests (TBD)

```bash
pnpm test               # Run all tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # Coverage report
```

**Test files**:
- `src/**/*.test.ts` - Unit tests
- `worker/src/**/*.test.ts` - Worker tests

**Framework**: Vitest

**Coverage targets**:
- Utilities: 80%+
- Business logic: 70%+
- Components: 50%+

### Integration Tests (TBD)

**End-to-end flow**:
1. Publish asset (paste mode)
2. Worker processes variants
3. Asset appears in marketplace
4. Purchase asset (download mode)
5. Verify procurement delivered

**Framework**: Playwright

### Manual Testing Checklist

**Publishing**:
- [ ] GitHub mode works
- [ ] Paste mode works
- [ ] Validation catches errors
- [ ] Asset appears in dashboard

**Translation**:
- [ ] Worker claims jobs without duplicates
- [ ] Python → JS translation works
- [ ] JS → TypeScript translation works
- [ ] TypeScript → Python translation works
- [ ] Tests run in Docker
- [ ] Failed tests marked correctly
- [ ] Source language variant passes
- [ ] Asset publishes when source passes

**Marketplace**:
- [ ] Assets listed correctly
- [ ] Search/filter works
- [ ] Language badges show status
- [ ] Asset detail page loads
- [ ] Code remains hidden pre-purchase

**Purchase**:
- [ ] GitHub PR delivery creates PR
- [ ] Download delivery grants access
- [ ] Procurement shows in dashboard
- [ ] Developer earnings updated
- [ ] Payment record created

**Auth**:
- [ ] GitHub sign-in works
- [ ] GitHub App install works
- [ ] Session persists
- [ ] Sign-out works

---

## Performance Optimization

### Frontend

- **Code splitting**: Dynamic imports for heavy components
- **Image optimization**: Next.js Image component
- **Font optimization**: next/font for web fonts
- **Caching**: Static asset CDN via Netlify

### API

- **Database indexing**: Indexed on `status`, `developer_id`, `created_at`, `tags`
- **Connection pooling**: Supabase Postgres pooler
- **Query optimization**: Select only needed fields
- **Caching**: TBD (Redis for hot assets)

### Worker

- **Parallel processing**: Multiple worker instances with `SKIP LOCKED`
- **Docker layer caching**: Pre-built images with common deps
- **Batch operations**: Bulk updates where possible
- **Efficient polling**: Exponential backoff on empty queue

### Monitoring

**Metrics to track**:
- Translation success rate
- Average translation time
- Test pass rate by language
- API response times
- Error rates
- Queue depth

**Tools** (TBD):
- Sentry (error tracking)
- LogRocket (session replay)
- Supabase Analytics (database)
- Netlify Analytics (traffic)
- Railway Logs (worker)

---

## Roadmap

### MVP (Current)

- [x] Python, JavaScript, TypeScript support
- [x] GitHub App integration
- [x] Paste code mode
- [x] OpenAI translation
- [x] Docker test execution
- [x] Marketplace with test badges
- [x] GitHub PR delivery
- [x] Download delivery
- [x] Developer earnings tracking
- [ ] Stripe payments (stubbed)

### Phase 1 (Next 3 months)

- [ ] Stripe Checkout integration
- [ ] Email notifications (SendGrid/Resend)
- [ ] Asset analytics (views, purchases)
- [ ] Review/rating system
- [ ] Improved error handling
- [ ] Performance monitoring

### Phase 2 (3-6 months)

- [ ] Add Rust, Go support
- [ ] VS Code extension (publish from editor)
- [ ] Bulk licensing for agencies
- [ ] Private team libraries
- [ ] Translation quality scoring
- [ ] Auto-retry failed variants

### Phase 3 (6-12 months)

- [ ] Multi-file/package translations
- [ ] Mobile SDKs (Swift, Kotlin)
- [ ] Java, C# support
- [ ] API for programmatic access
- [ ] Webhook events for integrations
- [ ] Advanced search (ElasticSearch)

### Long-Term Vision

- Become the GitHub Marketplace for multi-language components
- Platform for cross-language open-source contributions
- Developer income platform (code + docs + courses + consulting)
- AI-powered code review and optimization suggestions

---

## Business Model

### Revenue Streams

**1. Transaction Fees** (Primary)
- 20% platform fee on every sale
- Developer keeps 80%
- Avg transaction: $20-100
- Target: 10K transactions/month = $40-200K/month

**2. Premium Features** (Phase 2)
- Featured listings: $50/month
- Analytics dashboard: $20/month
- Priority translation: $10/month

**3. Enterprise** (Phase 3)
- Private asset libraries: $500+/month
- Custom language support: $1000+/month
- Volume licensing: negotiated

### Unit Economics

- **CAC**: $10-15 (organic, SEO, dev communities)
- **LTV**: $500-1000 (repeat purchases, premium)
- **LTV:CAC**: 50:1+
- **Margin**: 85%+ (low infrastructure cost)
- **Break-even**: 2K transactions/month

### Pricing Strategy

**Asset Pricing** (set by developers):
- Simple utility: $5-20
- API wrapper: $20-50
- Feature module: $50-200
- Production system: $200-500

**Platform takes 20%**, developer keeps 80%.

---

## Market Opportunity

### TAM (Total Addressable Market)

- $500B global software development market
- 50M+ developers worldwide
- 3 core languages cover 60% of web/backend dev

### SAM (Serviceable Available Market)

- 10M developers building reusable components
- $50B spent on code reuse, libraries, tooling
- Avg developer could sell 5-10 assets/year

### SOM (Serviceable Obtainable Market)

- 100K developers as early adopters (year 1-2)
- $50M GMV target
- $10M platform revenue (20% take rate)

### Competitive Advantage

1. **Only verified multi-language marketplace**
2. **AI translation quality** (GPT-5.5)
3. **Pre-purchase testing** (buyers see results)
4. **Developer-friendly** (80/20 split vs. 50-70% elsewhere)
5. **Docker isolation** (safe, repeatable)
6. **First-mover advantage**

---

## Common Issues & Solutions

### Build Fails on Netlify

**Symptom**: Build succeeds locally, fails on Netlify

**Causes**:
- Missing environment variables
- Different Node version
- Dependency version conflicts

**Solutions**:
1. Check Netlify build logs
2. Verify all env vars set in Netlify UI
3. Set `NODE_VERSION=20` in `netlify.toml`
4. Clear build cache and redeploy

### Runtime Error: "Missing Supabase environment variables"

**Symptom**: App loads but crashes on any page

**Cause**: Env vars not set in Netlify dashboard

**Solution**:
1. Go to Site Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy (or trigger auto-deploy)

### Worker Not Processing Jobs

**Symptom**: Assets stay in "verifying" status forever

**Causes**:
- Worker not running
- Worker can't connect to database
- Docker not running on worker host

**Solutions**:
1. Check Railway/Render logs for worker errors
2. Verify Supabase env vars set correctly
3. Ensure Docker daemon running
4. Check worker images exist: `docker images | grep singularity`

### GitHub Auth Not Working

**Symptom**: Sign-in redirects but doesn't complete

**Causes**:
- GitHub App callback URL mismatch
- Supabase auth provider not enabled
- Client ID/secret mismatch

**Solutions**:
1. Verify callback URL in GitHub App matches Supabase
2. Enable GitHub provider in Supabase dashboard
3. Double-check client ID and secret match in both places
4. Check Supabase auth logs for errors

### Translations Always Fail

**Symptom**: All variants go to "failed" status

**Causes**:
- OpenAI API key invalid/expired
- OpenAI API rate limited
- Network issues from worker

**Solutions**:
1. Verify OpenAI API key is valid
2. Check API quota/billing at platform.openai.com
3. Check worker logs for API errors
4. Ensure worker has internet access (for OpenAI API)

### Tests Failing in Docker

**Symptom**: Translation succeeds but tests fail

**Causes**:
- Syntax errors in translated code
- Missing dependencies
- Test framework issues
- Resource limits too strict

**Solutions**:
1. Check `test_output` field on variant for error details
2. Verify dependencies are in Docker image or install step
3. Increase timeout/memory limits if needed
4. Review translated code for issues

---

## Contributing

### Development Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run linter: `pnpm lint`
5. Run type check: `pnpm exec tsc --noEmit`
6. Test locally
7. Commit: `git commit -m "Add my feature"`
8. Push: `git push origin feature/my-feature`
9. Open Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Functional components (React)
- Server components by default
- Client components only when needed
- No semicolons
- Active voice in comments

### Commit Messages

```
feat: Add Rust language support
fix: Resolve Docker timeout issue
docs: Update deployment guide
refactor: Simplify translation logic
test: Add unit tests for validation
chore: Update dependencies
```

---

## License

**MIT License** (TBD - update when ready)

Copyright (c) 2026 Singularity

Permission is hereby granted, free of charge, to any person obtaining a copy...

---

## Contact & Support

**Website**: https://singularity.app (TBD)
**Email**: support@singularity.app (TBD)
**GitHub**: https://github.com/singularity-app (TBD)
**Twitter**: @singularityapp (TBD)
**Discord**: discord.gg/singularity (TBD)

---

## Credits

**Built with**:
- Next.js by Vercel
- Supabase by Supabase Inc.
- OpenAI GPT by OpenAI
- shadcn/ui by shadcn
- Tailwind CSS by Tailwind Labs
- Docker by Docker Inc.

**Inspired by**:
- npm/PyPI (package ecosystems)
- CodeCanyon/Gumroad (creator marketplaces)
- GitHub Copilot (AI-assisted dev)

---

**Last Updated**: May 21, 2026

**Version**: 1.0.0 (MVP)

**Status**: Production-ready, deployed on Netlify + Railway
