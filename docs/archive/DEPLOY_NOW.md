# Deploy Singularity Now - Quick Commands

All CLIs are installed! Follow these commands to deploy.

---

## ✅ Verified Installed
- Supabase CLI: 2.101.0
- Netlify CLI: 26.0.2
- GitHub CLI: 2.86.0

---

## Step 1: Supabase (5 minutes)

### Create Project

1. **Go to**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Click**: "New project"
3. **Fill in**:
   - Name: `singularity`
   - Database password: (strong password)
   - Region: (closest to you)
4. **Wait**: ~2 minutes for creation

### Link Local Project

```bash
# Login to Supabase
supabase login

# Get your project ref from dashboard URL:
# https://app.supabase.com/project/YOUR-REF-HERE
# Copy YOUR-REF-HERE part

# Link project
supabase link --project-ref YOUR-REF-HERE

# Push database migrations
supabase db push
```

### Get Credentials

**Go to**: Project Settings → API

Copy these values:
- Project URL
- anon public key
- service_role key (from Service role tab)

Save them in a temp file, you'll need them soon.

---

## Step 2: GitHub App (3 minutes)

### Create App

**Go to**: [github.com/settings/apps/new](https://github.com/settings/apps/new)

**Fill in** (use placeholders for now, update after Netlify deploy):

- **GitHub App name**: `Singularity Dev` (or your choice)
- **Homepage URL**: `http://localhost:3000`
- **Callback URL**: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
  - Replace YOUR-PROJECT-REF with your actual project ref
- **Setup URL**: `http://localhost:3000/dashboard`
- **Webhook URL**: `http://localhost:3000/api/webhooks/github`
- **Webhook secret**: Run this command:
  ```bash
  openssl rand -hex 32
  ```
  Copy the output

**Permissions** (Repository permissions):
- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read-only

**Permissions** (Account permissions):
- Email addresses: Read-only

**Subscribe to events**:
- [x] Installation

**Where can this GitHub App be installed?**
- Only on this account

**Click**: "Create GitHub App"

### Save Credentials

After creating, on the app settings page:

1. Note the **App ID** (top of page)
2. Generate **Client secret** → Copy it
3. Generate **Private key** → Download the .pem file
4. Note the **App slug** (from the public page URL)

**Convert private key** to env var format:
```bash
# Replace with your downloaded file path
cat ~/Downloads/singularity-dev.*.private-key.pem | awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}'
```
Copy the output (should be one long line with `\n` in it).

---

## Step 3: Netlify (5 minutes)

### Login

```bash
netlify login
```
This opens browser - authorize the CLI.

### Initialize Site

```bash
# Make sure you're in the project root
cd /Users/eyerise/Documents/sigularity

# Initialize
netlify init
```

**Choose**:
- Create & configure a new site
- Team: (your team)
- Site name: `singularity` (or leave blank for auto-generate)

**It will ask about build settings**:
- Build command: `pnpm build`
- Publish directory: `.next`
- Functions directory: (leave empty)

### Set Environment Variables

**Replace the values below with your actual credentials:**

```bash
# Supabase (from Step 1)
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://YOUR-REF.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGc..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGc..."

# OpenAI
netlify env:set OPENAI_API_KEY "sk-..."

# GitHub App (from Step 2)
netlify env:set GITHUB_APP_ID "123456"
netlify env:set GITHUB_APP_SLUG "singularity-dev"
netlify env:set GITHUB_APP_CLIENT_ID "Iv1.abc123"
netlify env:set GITHUB_APP_CLIENT_SECRET "abc123def456"
netlify env:set GITHUB_APP_WEBHOOK_SECRET "your-webhook-secret-from-step-2"

# For GITHUB_APP_PRIVATE_KEY, use the converted value from Step 2:
netlify env:set GITHUB_APP_PRIVATE_KEY "-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----"
```

**Get your Netlify URL** (you'll need it next):
```bash
netlify status
# Look for "URL:" in the output
```

**Now set the app URL**:
```bash
# Replace with your actual Netlify URL
netlify env:set NEXT_PUBLIC_APP_URL "https://your-site.netlify.app"
```

### Deploy

```bash
# Deploy to production
netlify deploy --prod
```

This will:
1. Build your app
2. Upload to Netlify
3. Go live

**Expected output**: "Deploy is live!" with your URL.

---

## Step 4: Update GitHub App (2 minutes)

Now that you have your Netlify URL, update the GitHub App:

1. **Go to**: [github.com/settings/apps](https://github.com/settings/apps)
2. **Click** your app
3. **Update**:
   - Homepage URL: `https://your-site.netlify.app`
   - Webhook URL: `https://your-site.netlify.app/api/webhooks/github`
   - Setup URL: `https://your-site.netlify.app/dashboard`
4. **Save changes**

---

## Step 5: Configure Supabase Auth (2 minutes)

### Enable GitHub Provider

1. **Go to**: Supabase Dashboard → Authentication → Providers
2. **Find**: GitHub
3. **Toggle**: Enable
4. **Enter**:
   - Client ID: (from your GitHub App - Step 2)
   - Client Secret: (from your GitHub App - Step 2)
5. **Save**

### Set Redirect URLs

1. **Go to**: Authentication → URL Configuration
2. **Set Site URL**: `https://your-site.netlify.app`
3. **Add Redirect URL**: `https://your-site.netlify.app/**`
4. **Save**

---

## Step 6: Test Your Deployment (2 minutes)

```bash
# Open your site
netlify open

# Or visit directly
echo "Your site: https://your-site.netlify.app"
```

**Test these**:
- [ ] Homepage loads
- [ ] Click "Sign in" → GitHub auth works
- [ ] After login, dashboard loads
- [ ] Click "Install GitHub App" → Installation works
- [ ] Dashboard shows "Installed #12345"

---

## Step 7: Deploy Worker to Railway (10 minutes)

The worker **must** be deployed separately because Netlify doesn't support Docker.

### Option A: Railway (Recommended)

#### Install Railway CLI

```bash
brew install railway
```

#### Deploy Worker

```bash
# Go to worker directory
cd worker

# Login to Railway (opens browser)
railway login

# Initialize project
railway init

# You'll be asked:
# - Create a new project
# - Name it "singularity-worker"

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://YOUR-REF.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
railway variables set OPENAI_API_KEY="sk-..."
railway variables set WORKER_ID="worker-railway-1"
railway variables set WORKER_POLL_INTERVAL_MS="5000"
railway variables set WORKER_CLAIM_TIMEOUT_MINUTES="10"

# Deploy
railway up
```

#### Check Worker Logs

```bash
# View logs in real-time
railway logs --follow
```

You should see: "Worker started, polling for jobs..."

### Option B: Railway Web UI

If CLI doesn't work:

1. **Go to**: [railway.app](https://railway.app)
2. **New Project** → Deploy from GitHub repo
3. **Select**: Your repository
4. **Settings**:
   - Root Directory: `worker`
   - Build Command: `pnpm install && pnpm run build:images`
   - Start Command: `pnpm dev`
5. **Add variables** (same as CLI above)
6. **Deploy**

---

## Step 8: Test Full Flow (5 minutes)

### Publish an Asset

1. **Go to**: `https://your-site.netlify.app/publish`
2. **Choose**: "Paste code"
3. **Paste** this example:

**Source Language**: Python

**Source Code**:
```python
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b
```

**Test Code**:
```python
from solution import add, multiply

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0

def test_multiply():
    assert multiply(2, 3) == 6
    assert multiply(-1, 5) == -5
```

4. **Fill in**:
   - Title: "Simple Math Functions"
   - Short description: "Add and multiply two numbers"
   - Summary: "Basic arithmetic operations for testing the platform"
   - Tags: math, python
   - Price: $5.00 ($500 in cents)

5. **Submit**

### Check Worker Processing

```bash
# In worker terminal:
railway logs --follow

# You should see:
# - Claimed variant...
# - Translating from python to javascript...
# - Running tests...
# - Variant marked as passed/failed
```

### Check Marketplace

1. **Go to**: `https://your-site.netlify.app/marketplace`
2. **Your asset should appear** after ~1 minute
3. **Check badges**: Python should be green ✓
4. **Wait ~5 more minutes**: JS and TS variants will process

---

## 🎉 You're Live!

Your Singularity marketplace is now:
- ✅ Deployed on Netlify
- ✅ Connected to Supabase
- ✅ GitHub OAuth working
- ✅ Worker translating code
- ✅ Ready for users

---

## Quick Reference Commands

```bash
# View Netlify logs
netlify logs

# View site in browser
netlify open

# Deploy updates
git push  # Netlify auto-deploys on push

# View worker logs
cd worker && railway logs --follow

# Restart worker
railway restart

# Check Supabase status
supabase status

# View Supabase database
supabase db remote list
```

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

```bash
# Check env vars are set
netlify env:list

# If missing, set them again (Step 3)
```

### Error: GitHub auth doesn't work

```bash
# Verify callback URL in GitHub App matches Supabase
echo "Should be: https://YOUR-REF.supabase.co/auth/v1/callback"

# Check Supabase Auth provider is enabled
# Go to: Authentication → Providers → GitHub
```

### Worker not processing

```bash
# Check worker is running
railway status

# Check logs for errors
railway logs

# Verify env vars in Railway match Netlify
railway variables
```

---

## Next Steps

1. **Invite beta testers**
2. **Monitor with**: `netlify logs` and `railway logs`
3. **Iterate based on feedback**
4. **Add custom domain** (optional)
5. **Set up error monitoring** (Sentry)
6. **Enable Stripe** (Phase 5)

See **PITCH_DECK.md** to start fundraising!

---

**Total Time**: ~30 minutes
**Cost**: $0-5/month (Netlify + Railway free tiers)
**Status**: Production-ready ✅
