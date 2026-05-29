# Singularity Quick Reference

## One-Page Overview

**What**: Multi-language code marketplace with AI adaptation and automated testing
**Languages**: TypeScript, JavaScript, Java (MVP)
**Tech**: Next.js 15, Supabase, OpenAI, Docker
**Status**: MVP complete and functional
**Default mode**: Demo data only. Set `NEXT_PUBLIC_REAL_BACKEND=true` and `SINGULARITY_REAL_BACKEND=true` to use live services.

---

## Deploy to Netlify (5 Minutes)

### 1. Connect Repository
- Go to [Netlify](https://app.netlify.com)
- "Add new site" → "Import an existing project"
- Select your Git repository

### 2. Configure Build
Build settings are auto-detected from `netlify.toml`:
- Build command: `pnpm build`
- Publish directory: `.next`
- Node version: 20

### 3. Add Environment Variables
Copy from `.env.local.example` and update:

**Required**:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.5
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.abc123
GITHUB_APP_CLIENT_SECRET=abc123def456
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
GITHUB_APP_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
NEXT_PUBLIC_REAL_BACKEND=
SINGULARITY_REAL_BACKEND=
```

**Optional** (Phase 5):
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Deploy Worker Separately
The worker **cannot run on Netlify** (needs Docker).

**Option A: Railway** (Recommended)
1. Create Railway account
2. "New Project" → Connect repository
3. Set root directory to `worker`
4. Add same environment variables as Netlify
5. Deploy

**Option B: Render**
1. Create Render account
2. "New Background Worker"
3. Build command: `pnpm install && pnpm run build:images`
4. Start command: `pnpm dev`
5. Add environment variables

**Option C: Fly.io**
1. Install flyctl: `brew install flyctl`
2. `cd worker && fly launch`
3. Configure Dockerfile
4. `fly deploy`

### 5. Update GitHub App
After deployment, update at https://github.com/settings/apps:
- Homepage URL: `https://your-app.netlify.app`
- Callback URL: `https://your-project.supabase.co/auth/v1/callback`
- Setup URL: `https://your-app.netlify.app/dashboard`
- Webhook URL: `https://your-app.netlify.app/api/webhooks/github`

### 6. Configure Supabase
In Supabase dashboard:
- Auth → URL Configuration → Site URL: `https://your-app.netlify.app`
- Auth → Providers → Enable GitHub
- Add Netlify URL to Redirect URLs

### 7. Test End-to-End
1. Visit your Netlify URL
2. Sign in with GitHub
3. Install GitHub App
4. Publish a code asset
5. Check worker logs for adaptation and tests
6. Browse marketplace
7. Purchase an asset

---

## Pitch Deck (30-Second Version)

**Problem**: Developers rebuild code across stacks. Buyers can't verify quality or portability.

**Solution**: Singularity adapts code with AI, tests in Docker, and sells verified versions.

**How**: Publish TS/JS/Java → Verify source → Adapt selected targets → Deliver only passing code

**Market**: Beachhead in indie scripting, with expansion into broader software reuse

**Business Model**: 70% creator share, 25% platform fee, 5% referral reserve

**Traction**: MVP working, XX beta users, XX assets published

**Ask**: $500-750K seed to add languages, scale to 10K developers, hit $1M ARR

**Exit**: Acquisition by GitHub, GitLab, Atlassian, or Stripe Atlas ($30-200M range)

---

## Key Metrics to Track

**Developer Side**:
- Monthly Active Developers (Publishers)
- Assets Published per Month
- Avg Assets per Developer
- Adaptation Success Rate

**Buyer Side**:
- Monthly Active Buyers
- Transactions per Month
- Avg Transaction Value
- Repeat Purchase Rate

**Platform**:
- GMV (Gross Merchandise Value)
- Revenue (25% of GMV)
- Test Pass Rate
- API Uptime
- Worker Processing Time

**Growth**:
- Developer MoM Growth
- Buyer MoM Growth
- Word-of-mouth coefficient (k-factor)

---

## Troubleshooting

### Build Fails on Netlify
- Check Node version (must be 20+)
- Verify all env vars are set
- Check build logs for missing dependencies

### Worker Not Processing
- Verify worker is running: check Railway/Render logs
- Check Supabase connection: verify service role key
- Ensure Docker images built: `pnpm run worker:build-images`
- Check for stale claims: query `asset_variants` table

### GitHub Auth Not Working
- Verify GitHub App callback URL matches Supabase
- Check Supabase auth provider is enabled
- Ensure GitHub App client ID/secret match in both places

### Adaptations Failing
- Check OpenAI API key is valid
- Verify worker has network access
- Check OpenAI API rate limits
- Review worker logs for errors

### Tests Not Running
- Ensure Docker daemon is running (on worker host)
- Check Docker images exist: `docker images | grep singularity`
- Verify test code format (vitest or JUnit 5)
- Check resource limits (memory, CPU, timeout)

---

## Support & Resources

**Documentation**:
- [Full Deployment Guide](./DEPLOYMENT.md)
- [Pitch Deck Breakdown](./PITCH_DECK.md)
- [Build Specifications](./BUILD_PROMPT.md)

**Supabase**:
- Docs: https://supabase.com/docs
- Studio: https://app.supabase.com

**Netlify**:
- Docs: https://docs.netlify.com
- Dashboard: https://app.netlify.com

**OpenAI**:
- Docs: https://platform.openai.com/docs
- Console: https://platform.openai.com

**Railway**:
- Docs: https://docs.railway.app
- Dashboard: https://railway.app

---

## Quick Commands

```bash
# Local development
pnpm install
pnpm dev                        # Start Next.js (port 3000)
pnpm worker                     # Start worker (separate terminal)
pnpm run worker:build-images    # Build Docker sandboxes

# Database
supabase start                  # Start local Supabase
supabase db reset               # Reset database
supabase db push                # Push migrations to production
pnpm run generate-types         # Regenerate TypeScript types

# Production
pnpm build                      # Build for production
pnpm start                      # Start production server
pnpm lint                       # Run ESLint

# Debugging
docker ps                       # Check running containers
docker logs <container-id>      # View container logs
supabase status                 # Check Supabase status
```

---

## Cost Breakdown (Monthly)

**Development** (Free):
- Netlify: Free tier (100GB bandwidth)
- Supabase: Free tier (500MB database)
- GitHub: Free for personal apps
- OpenAI API: usage-based, depending on model and adaptation volume

**Production** (MVP scale):
- Netlify: $0-19/month
- Railway/Render: $5-20/month
- Supabase Pro: $25/month
- OpenAI API: usage-based
- **Total: ~$100/month**

**At Scale** (10K users, 100K adaptations/month):
- Netlify Pro: $19/month
- Railway: $50/month
- Supabase Pro: $25/month
- OpenAI API: usage-based
- CDN: $50/month
- **Total: ~$650/month**

---

## Next Steps

1. ✅ MVP complete and functional
2. ⏳ Deploy to Netlify (you)
3. ⏳ Deploy worker to Railway/Render (you)
4. ⏳ Recruit beta testers (10-20 developers)
5. ⏳ Collect feedback and iterate
6. ⏳ Prepare pitch deck presentation
7. ⏳ Launch on Hacker News / Product Hunt
8. ⏳ Start fundraising conversations

**You're ready to ship!**
