# CLI-Based Deployment Guide

This guide walks you through deploying Singularity using command-line tools instead of web UIs.

## Prerequisites

The CLIs are being installed for you. Once complete, you'll have:
- ✅ Supabase CLI
- ✅ Netlify CLI
- ✅ GitHub CLI (already installed)

---

## Step 1: Create Supabase Project

### Option A: Via Web (Easier)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Fill in:
   - Name: `singularity`
   - Database password: (generate a strong one)
   - Region: (closest to you)
4. Wait for project to be created (~2 minutes)

### Option B: Via CLI (Coming Soon)
Supabase CLI doesn't support project creation yet. Use web UI above.

### Get Your Credentials

```bash
# Login to Supabase
supabase login

# Link your local project to the remote one
# (Get project ref from your dashboard URL: app.supabase.com/project/YOUR-REF-HERE)
supabase link --project-ref YOUR-PROJECT-REF

# Push your database migrations
supabase db push
```

### Get Environment Variables

```bash
# Get your project URL and keys
# Go to: Project Settings → API in Supabase dashboard
# Copy these values:

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role tab
```

---

## Step 2: Create GitHub App

### Using GitHub CLI

```bash
# Check if you're logged in
gh auth status

# If not logged in:
gh auth login

# Create GitHub App (interactive)
gh api -X POST /user-settings/apps \
  -f name="Singularity App" \
  -f url="https://your-app.netlify.app" \
  -f hook_attributes[url]="https://your-app.netlify.app/api/webhooks/github" \
  -f hook_attributes[active]=true \
  -f public=false \
  -f default_permissions[contents]=write \
  -f default_permissions[pull_requests]=write \
  -f default_permissions[metadata]=read \
  -f default_events[]="installation"
```

**Note**: The CLI method for GitHub Apps is complex. It's easier to use the web UI:
1. Go to [github.com/settings/apps/new](https://github.com/settings/apps/new)
2. Fill in the form (see below)

### GitHub App Settings

**Basic Info**:
- GitHub App name: `Singularity` (or your preferred name)
- Homepage URL: `https://your-app.netlify.app` (update after Netlify deploy)
- Callback URL: `https://your-project.supabase.co/auth/v1/callback`
- Setup URL: `https://your-app.netlify.app/dashboard`
- Webhook URL: `https://your-app.netlify.app/api/webhooks/github`
- Webhook secret: Generate with: `openssl rand -hex 32`

**Permissions**:
- Repository permissions:
  - Contents: Read & write
  - Pull requests: Read & write
  - Metadata: Read-only
- Account permissions:
  - Email addresses: Read-only

**Subscribe to events**:
- [x] Installation

**Where can this GitHub App be installed?**
- Only on this account

### Save GitHub App Credentials

After creating, note down:
```bash
GITHUB_APP_ID=123456  # From app settings page
GITHUB_APP_SLUG=your-app-slug  # From the app URL
GITHUB_APP_CLIENT_ID=Iv1.abc123  # From app settings
GITHUB_APP_CLIENT_SECRET=abc123def  # Generate one
GITHUB_APP_PRIVATE_KEY=  # Generate and download
GITHUB_APP_WEBHOOK_SECRET=  # The one you generated above
```

**For the private key**, download it and convert to single line:
```bash
# Convert private key to env var format
cat ~/Downloads/singularity-app.private-key.pem | awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}'
# Copy output and use as GITHUB_APP_PRIVATE_KEY value
```

---

## Step 3: Deploy to Netlify

### Login to Netlify

```bash
# Login (opens browser)
netlify login
```

### Initialize Site

```bash
# Initialize Netlify site in this directory
netlify init

# Choose:
# > Create & configure a new site
# > Team: Your team
# > Site name: singularity (or auto-generate)
# > Build command: pnpm build
# > Publish directory: .next
```

### Set Environment Variables

Instead of using the UI, use CLI:

```bash
# Set Supabase vars
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJ..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJ..."

# Set OpenAI var
netlify env:set OPENAI_API_KEY "sk-..."

# Set GitHub App vars
netlify env:set GITHUB_APP_ID "123456"
netlify env:set GITHUB_APP_SLUG "your-app-slug"
netlify env:set GITHUB_APP_CLIENT_ID "Iv1.abc123"
netlify env:set GITHUB_APP_CLIENT_SECRET "abc123def"
netlify env:set GITHUB_APP_PRIVATE_KEY "-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----"
netlify env:set GITHUB_APP_WEBHOOK_SECRET "your-webhook-secret"

# Set app URL (after getting Netlify URL)
netlify env:set NEXT_PUBLIC_APP_URL "https://your-app.netlify.app"
```

**Pro tip**: Use a heredoc for the private key:
```bash
netlify env:set GITHUB_APP_PRIVATE_KEY "$(cat <<'EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(full key here)
...
-----END RSA PRIVATE KEY-----
EOF
)"
```

### Deploy

```bash
# Deploy to production
netlify deploy --prod

# Or deploy to preview first
netlify deploy  # Preview deploy
# Check it works, then:
netlify deploy --prod  # Production deploy
```

### Get Your URL

```bash
# Get site info
netlify status

# Your site is live at: https://your-app.netlify.app
```

---

## Step 4: Update GitHub App URLs

Now that you have your Netlify URL, update the GitHub App:

```bash
# Get your Netlify URL
NETLIFY_URL=$(netlify status --json | jq -r '.url')

echo "Update your GitHub App with these URLs:"
echo "- Homepage: $NETLIFY_URL"
echo "- Webhook: $NETLIFY_URL/api/webhooks/github"
echo "- Setup: $NETLIFY_URL/dashboard"
```

Go to [github.com/settings/apps](https://github.com/settings/apps), select your app, and update the URLs.

---

## Step 5: Configure Supabase Auth

### Enable GitHub Provider

```bash
# Via web UI (no CLI command available):
# 1. Go to: Authentication → Providers → GitHub
# 2. Enable GitHub provider
# 3. Enter GitHub App Client ID and Secret
# 4. Save
```

### Set Redirect URLs

```bash
# Via web UI:
# 1. Authentication → URL Configuration
# 2. Site URL: https://your-app.netlify.app
# 3. Redirect URLs: https://your-app.netlify.app/**
# 4. Save
```

---

## Step 6: Deploy Worker to Railway

The worker **cannot run on Netlify**. Deploy it separately.

### Using Railway CLI

```bash
# Install Railway CLI
brew install railway

# Login
railway login

# Initialize project (in worker directory)
cd worker
railway init

# Link to new project
railway link

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
railway variables set OPENAI_API_KEY="sk-..."
railway variables set WORKER_ID="worker-railway-1"
railway variables set WORKER_POLL_INTERVAL_MS="5000"
railway variables set WORKER_CLAIM_TIMEOUT_MINUTES="10"

# Deploy
railway up
```

### Or Use Railway Web UI

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select repository
4. Set root directory: `worker`
5. Add environment variables
6. Deploy

---

## Step 7: Test Deployment

### Quick Tests

```bash
# Test Netlify deployment
curl https://your-app.netlify.app

# Check build logs
netlify logs

# Open site in browser
netlify open

# Check Supabase connection
supabase db remote list
```

### Full Testing Checklist

Visit your app and test:

- [ ] Homepage loads
- [ ] Sign in with GitHub
- [ ] Dashboard shows after login
- [ ] Install GitHub App
- [ ] Go to /publish
- [ ] Create asset (paste mode)
- [ ] Asset appears in dashboard as "verifying"
- [ ] Worker processes (check Railway logs)
- [ ] Asset becomes "published" after source variant passes
- [ ] Marketplace shows asset
- [ ] Can purchase asset
- [ ] Procurement shows in dashboard

---

## Useful Commands

### Netlify

```bash
# View site
netlify open

# View logs
netlify logs

# View functions
netlify functions:list

# View environment variables
netlify env:list

# Deploy
netlify deploy --prod

# Rollback
netlify rollback
```

### Supabase

```bash
# View remote status
supabase db remote status

# View logs
supabase functions logs

# Generate types
supabase gen types typescript --linked > src/types/database.ts

# Reset local database
supabase db reset

# Push migrations
supabase db push
```

### Railway

```bash
# View logs
railway logs

# View status
railway status

# Redeploy
railway up

# Open dashboard
railway open
```

### GitHub

```bash
# View your apps
gh api /user-settings/apps

# View app installations
gh api /user/installations
```

---

## Troubleshooting

### Build Fails on Netlify

```bash
# Check build logs
netlify logs --build

# Test build locally
pnpm build

# Check environment variables
netlify env:list
```

### Worker Not Processing

```bash
# Check Railway logs
railway logs --follow

# Check worker is running
railway status

# Restart worker
railway restart
```

### Auth Not Working

```bash
# Check Supabase auth logs
supabase logs --type auth

# Verify GitHub App callback URL matches Supabase
echo "GitHub App callback should be:"
supabase status | grep "API URL" | awk '{print $3}' | sed 's/$/\/auth\/v1\/callback/'
```

---

## Quick Deployment Script

I've created a script that automates most of this:

```bash
# Make it executable
chmod +x deploy.sh

# Run it
./deploy.sh
```

The script will:
1. Check CLI tools are installed
2. Help you set up Supabase
3. Deploy to Netlify
4. Guide you through GitHub App creation
5. Remind you to deploy the worker

---

## Next Steps

After successful deployment:

1. **Test thoroughly** (see testing checklist above)
2. **Configure custom domain** (optional)
3. **Set up monitoring** (Sentry, LogRocket)
4. **Enable Stripe** (Phase 5)
5. **Launch** to beta testers

See **DEPLOYMENT_SUMMARY.md** for detailed post-deployment steps.

---

## Support

If you run into issues:

1. Check logs: `netlify logs`, `railway logs`
2. Verify env vars: `netlify env:list`
3. See **NETLIFY_FIXES.md** for common issues
4. See **CLAUDE.md** for architecture details

---

**Status**: CLIs installed, deployment script ready ✅
