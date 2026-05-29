# Singularity Deployment Guide

## Netlify Deployment (Frontend + API)

### Prerequisites
- A Netlify account
- A hosted Supabase project (create at supabase.com)
- A GitHub App configured for production
- An OpenAI API key
- A separate hosting service for the worker (Railway, Render, or similar)

### Steps

#### 1. Deploy to Netlify

1. Connect your Git repository to Netlify
2. Build settings:
   - Build command: `pnpm build`
   - Publish directory: `.next`
   - Node version: 20

3. Install the Next.js Netlify plugin (done automatically via netlify.toml)

#### 2. Configure Environment Variables in Netlify UI

Navigate to Site Settings → Environment Variables and add:

**Supabase** (from your hosted Supabase project):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**OpenAI**:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-5.5`)

**GitHub App** (update URLs to production):
- `GITHUB_APP_ID`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY` (replace actual newlines with `\n`)
- `GITHUB_APP_WEBHOOK_SECRET`

**App Config**:
- `NEXT_PUBLIC_APP_URL` (your Netlify domain, e.g., `https://your-app.netlify.app`)

**Stripe** (Phase 5):
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

#### 3. Update GitHub App Settings

After deployment, update your GitHub App at https://github.com/settings/apps:
- Homepage URL: `https://your-app.netlify.app`
- Callback URL: `https://your-supabase-project.supabase.co/auth/v1/callback`
- Setup URL: `https://your-app.netlify.app/dashboard`
- Webhook URL: `https://your-app.netlify.app/api/webhooks/github`

#### 4. Configure Supabase Auth

In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Set Site URL to your Netlify domain
3. Add your Netlify domain to Redirect URLs
4. Enable GitHub provider with your GitHub App credentials

## Worker Deployment (Separate Service)

**IMPORTANT**: Netlify does not support Docker or long-running background processes. Deploy the worker separately.

### Recommended Services for Worker:
- **Railway**: Supports Docker, persistent processes, affordable
- **Render**: Docker support, background workers
- **Fly.io**: Docker-native, good pricing
- **AWS ECS/Fargate**: Production-grade, more complex

### Worker Deployment Steps (Railway Example)

1. Create a new Railway project
2. Connect your repository
3. Configure build settings:
   - Root directory: `worker`
   - Build command: `pnpm install && pnpm run build:images`
   - Start command: `pnpm dev`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (same as Netlify)
   - `SUPABASE_SERVICE_ROLE_KEY` (same as Netlify)
   - `OPENAI_API_KEY` (same as Netlify)
   - `OPENAI_MODEL` (optional, same as Netlify)
   - `WORKER_ID` (e.g., `worker-railway-1`)
   - `WORKER_POLL_INTERVAL_MS` (default: `5000`)
   - `WORKER_CLAIM_TIMEOUT_MINUTES` (default: `10`)
5. Enable Docker support in Railway settings

### Alternative: Netlify Functions + Scheduled Tasks

For a Netlify-only deployment (no Docker testing):
1. Convert worker to Netlify scheduled functions
2. Remove Docker test execution (validate syntax only through the OpenAI model)
3. Store translated code in Supabase
4. Trade-off: No real test execution in sandboxes

## Database Migrations (Supabase)

### Initial Setup
1. Create a hosted Supabase project
2. Run migrations locally first to test:
   ```bash
   supabase db push
   ```
3. Or apply migrations via Supabase dashboard SQL editor

### Schema Updates
- Develop locally with `supabase start`
- Create migrations: `supabase migration new <name>`
- Test locally: `supabase db reset`
- Deploy to production: `supabase db push --linked`

## Monitoring & Troubleshooting

### Netlify
- Check function logs in Netlify dashboard
- Monitor build logs for deployment issues
- Use Netlify Analytics for traffic insights

### Worker
- Add structured logging (Winston, Pino)
- Use Railway/Render logs to monitor job processing
- Set up alerts for failed translations

### Supabase
- Monitor Auth logs for sign-in issues
- Check Database logs for query performance
- Review Storage logs for file uploads (if added)

## Production Checklist

- [ ] Supabase project created and configured
- [ ] All environment variables set in Netlify
- [ ] GitHub App configured with production URLs
- [ ] Worker deployed on separate service
- [ ] Database migrations applied to production
- [ ] Auth callback URLs whitelisted in Supabase
- [ ] Test full flow: publish → translate → marketplace → purchase → delivery
- [ ] GitHub App installed to a test repo
- [ ] Stripe configured in test mode (Phase 5)
- [ ] Error monitoring setup (Sentry, LogRocket, etc.)
- [ ] Domain configured (optional)

## Scaling Considerations

### Multi-Worker Setup
- Deploy multiple worker instances with unique `WORKER_ID`s
- `SKIP LOCKED` prevents duplicate claims
- Load balance automatically via database polling

### Database
- Enable Supabase connection pooling
- Add indexes for common queries (already in migrations)
- Consider read replicas for marketplace queries

### Caching
- Add Redis for asset metadata caching
- Use Netlify Edge for static asset CDN
- Cache translated code variants in Supabase Storage

## Cost Estimates (MVP Scale)

**Netlify**:
- Free tier: 100GB bandwidth, 300 build minutes/month
- Starter: $19/month for more builds and bandwidth

**Railway/Render (Worker)**:
- $5-20/month for starter worker instance
- Scales with Docker image size and memory usage

**Supabase**:
- Free tier: 500MB database, 50k monthly active users
- Pro: $25/month for more storage and bandwidth

**OpenAI API**:
- Usage-based, depending on the configured model and translation volume

**Total MVP**: ~$30-50/month (excluding Stripe fees)
