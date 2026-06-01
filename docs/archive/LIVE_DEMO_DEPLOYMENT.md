# Live Demo Deployment Guide
**Deploy C# and C++ Support to Production**

## Overview

This guide walks you through deploying the new C# (Unity) and C++ (Unreal) language support to your live Singularity website, making it fully demoable for investors and users.

## Pre-Deployment Checklist

- [ ] Local development environment working
- [ ] Docker images built successfully
- [ ] Local demo passes (`demo/build-and-test.sh`)
- [ ] Supabase project access
- [ ] Netlify deployment access
- [ ] Railway/Render worker deployment access

## Step 1: Update Database Schema (5 minutes)

### 1.1 Run Migration on Supabase

```bash
# Navigate to project
cd /Users/eyerise/Documents/sigularity

# Option A: Using Supabase CLI (Recommended)
supabase db push

# Option B: Manual via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Navigate to SQL Editor
# 4. Copy contents of supabase/migrations/20260527000000_add_csharp_cpp_languages.sql
# 5. Execute the SQL
```

**Verify**:
```sql
-- Run this in Supabase SQL Editor to confirm
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assets' AND column_name = 'source_language';

-- Should show check constraint includes 'csharp' and 'cpp'
```

### 1.2 Seed Demo Asset (Optional but Recommended)

```bash
# In Supabase SQL Editor, run:
# Copy contents of supabase/seed_demo_asset.sql and execute

# This creates the Unity character jump controller in the marketplace
# so visitors can see a real C# → C++ translation immediately
```

## Step 2: Deploy Frontend to Netlify (10 minutes)

### 2.1 Push Code to GitHub

```bash
cd /Users/eyerise/Documents/sigularity

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Add C# and C++ support with physics-aware translation

- Add C# support for Unity, Godot, MonoGame
- Add C++ support for Unreal Engine
- Implement physics conversion (Y-up ↔ Z-up, m ↔ cm)
- Update database schema (csharp, cpp languages)
- Create Unity → Unreal demo asset
- Update frontend components and constants
- Add Docker test runners for C# and C++

Demo: /demo/unity-jump-controller.cs → Unreal C++
Migration: supabase/migrations/20260527000000_add_csharp_cpp_languages.sql"

# Push to GitHub
git push origin main
```

### 2.2 Netlify Auto-Deploy

Netlify should automatically detect the push and deploy:

1. Go to https://app.netlify.com
2. Find your Singularity project
3. Check "Deploys" tab
4. Wait for build to complete (~2-3 minutes)

**Manual trigger** (if needed):
```bash
# In Netlify dashboard: Deploys → Trigger deploy → Deploy site
```

### 2.3 Verify Frontend Deployment

Visit your site and check:

- [ ] `/publish` page shows C# and C++ in language dropdown
- [ ] Language badges display correctly for all 5 languages
- [ ] Marketplace search shows "C#" and "C++" filter options
- [ ] No console errors (open DevTools → Console)

**Test the publish flow**:
1. Go to `/publish`
2. Select "Paste code"
3. Choose "C#" as source language
4. Paste demo Unity controller code
5. Fill in metadata
6. Click "Publish"
7. Should succeed and create asset

## Step 3: Deploy Worker to Railway/Render (15 minutes)

### 3.1 Build Docker Images

The worker needs the new C# and C++ Docker images:

```bash
cd /Users/eyerise/Documents/sigularity

# Build all images (includes new ones)
pnpm run worker:build-images

# This builds:
# - singularity-csharp-runner (new)
# - singularity-cpp-runner (new)
# - singularity-node-runner (existing)
# - singularity-typescript-runner (existing)
# - singularity-java-runner (existing)
```

**Verify images**:
```bash
docker images | grep singularity
# Should show all 5 runners
```

### 3.2 Deploy to Railway (Recommended)

**Option A: Via Railway Dashboard**:

1. Go to https://railway.app/dashboard
2. Find your Singularity worker project
3. Go to Settings → Deploy
4. Click "Redeploy" to trigger new build
5. Railway will pull latest code and rebuild with new Dockerfiles

**Option B: Via Railway CLI**:
```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

### 3.3 Deploy to Render (Alternative)

1. Go to https://dashboard.render.com
2. Find your worker service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for build (~5-10 minutes)

### 3.4 Verify Worker Deployment

**Check logs**:
```bash
# Railway
railway logs

# Render
# Click "Logs" tab in dashboard
```

**Look for**:
```
Worker started
Polling for translation jobs...
Found Docker images: csharp, cpp, typescript, javascript, java
```

**Test translation**:
1. Go to your live site `/publish`
2. Create a C# asset
3. Watch worker logs - should pick up the job
4. Translate to all 5 languages
5. Run tests in Docker
6. Asset should appear in marketplace with variant statuses

## Step 4: Verify End-to-End Flow (10 minutes)

### 4.1 Complete Publish → Translate → Test Flow

**Test C# → C++ Translation**:

1. **Visit** `https://your-site.netlify.app/publish`

2. **Select**:
   - Source: "Paste code"
   - Language: "C#"

3. **Paste** Unity jump controller:
```csharp
// Copy from demo/unity-jump-controller.cs
using UnityEngine;

public class CharacterJumpController : MonoBehaviour
{
    [SerializeField] private float jumpHeight = 2.0f;
    [SerializeField] private float gravity = -9.81f;

    private Vector3 velocity;

    void Update()
    {
        if (Input.GetButtonDown("Jump"))
        {
            velocity.y = Mathf.Sqrt(-2f * gravity * jumpHeight);
        }

        velocity.y += gravity * Time.deltaTime;
    }
}
```

4. **Add tests**:
```csharp
// Copy from demo/unity-jump-controller-tests.cs
using Xunit;

public class JumpTests
{
    [Fact]
    public void JumpVelocity_IsCorrect()
    {
        float gravity = -9.81f;
        float height = 2.0f;
        float velocity = Mathf.Sqrt(-2f * gravity * height);
        Assert.True(velocity > 6.0f && velocity < 6.5f);
    }
}
```

5. **Fill metadata**:
   - Title: "Character Jump Controller"
   - Description: "Physics-based jump with configurable height"
   - Summary: "Unity character controller with realistic physics..."
   - Tags: "unity, physics, character, platformer"
   - Price: $50.00

6. **Publish** → Should succeed

7. **Watch worker logs**:
```
Claimed variant: asset_id=xxx target_language=cpp
Translating C# → C++...
Physics context detected: Unity (Y-up, -9.81 m/s²) → Unreal (Z-up, -980 cm/s²)
Translation complete: high confidence
Running tests in Docker...
Tests passed: 1/1
Variant marked as passed
```

8. **Check marketplace**:
   - Go to `/marketplace`
   - Find your asset
   - Should show:
     - ✅ C# (green badge - passed, source language)
     - ⏳ C++ (yellow badge - translating/testing)
     - ⏳ TypeScript (yellow badge - queued)
     - ⏳ JavaScript (yellow badge - queued)
     - ⏳ Java (yellow badge - queued)

9. **Wait for translations** (~2-5 minutes per language)

10. **Verify final result**:
    - All 5 language badges should be green (✅)
    - Click on asset → Should show translations available
    - C++ translation should have physics conversion notes
    - Tests should show as passed (e.g., "5/5 tests passed")

### 4.2 Test Purchase Flow

1. **Browse** marketplace
2. **Click** on C# jump controller asset
3. **Select** C++ variant
4. **Click** "Buy" (use test mode if Stripe not configured)
5. **Choose** delivery method (GitHub PR or Download)
6. **Complete purchase**
7. **Verify** you can access the translated C++ code

## Step 5: Demo for Investors (30 seconds)

### Quick Demo Script

**Show marketplace**:
> "Here's our live marketplace. This Unity character controller was written in C#. Watch - we can see it's been automatically translated to all 5 languages."

**Click on asset**:
> "The green checkmarks show all translations passed automated tests. Let's look at the C++ version - that's for Unreal Engine."

**Show variant**:
> "See these adaptation notes? The AI detected Unity's physics system and automatically converted: Y-axis became Z-axis, 2 meters became 200 centimeters, gravity scaled from -9.81 to -980. Same jump behavior, different engine."

**Show test results**:
> "All 5 physics tests passed. The translation preserves the exact jump height and trajectory. A game dev can buy this and drop it into Unity OR Unreal - their choice. Same asset, both engines."

**Explain value**:
> "Before Singularity: Find a $30 Unity asset, then pay a freelancer $500-1000 to port it to Unreal, wait 2 weeks, hope the physics match.
>
> With Singularity: Buy once for $50, get both versions instantly, AI-verified physics accuracy, tests prove it works. 5 minutes instead of 2 weeks."

## Troubleshooting

### Issue: Migration fails with "constraint already exists"

**Solution**: The constraint names might be different. Use this instead:
```sql
-- Drop all existing constraints
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_source_language_check;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_source_language_check1;

-- Add new constraint
ALTER TABLE public.assets
  ADD CONSTRAINT assets_source_language_check
  CHECK (source_language IN ('typescript', 'javascript', 'java', 'csharp', 'cpp'));
```

### Issue: Worker can't find Docker images

**Solution**: Rebuild images on the worker host
```bash
# SSH into Railway/Render instance (if possible)
# Or use Railway's build command:
railway run pnpm run worker:build-images

# For Render: Add to build script in dashboard
# Build Command: pnpm install && pnpm run worker:build-images
```

### Issue: Frontend shows old languages only

**Solution**: Clear cache and rebuild
```bash
# In Netlify dashboard:
# 1. Deploys → Trigger deploy → Clear cache and deploy site
# 2. Wait for rebuild
# 3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
```

### Issue: Tests fail with "Unity types not found"

**Solution**: This is expected for non-Unity environments. The Docker runner uses mocks. Check worker logs for actual error - might be dependency issue.

## Performance Monitoring

### Expected Metrics (Post-Deployment)

**Translation times**:
- C# → C++: 30-60 seconds (OpenAI call)
- Test execution: 10-30 seconds per language
- Total asset verification: 3-5 minutes for 5 languages

**Success rates** (target):
- Translation success: 85%+ (high confidence)
- Test pass rate: 70%+ for physics code
- Overall variant pass rate: 60%+ (some languages harder)

### Monitor in Supabase Dashboard

```sql
-- Check variant success rates
SELECT
  target_language,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'passed') AS passed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / COUNT(*), 1) AS pass_rate
FROM public.asset_variants
GROUP BY target_language;

-- Expected output:
-- csharp | 10 | 10 | 100.0  (source language always passes)
-- cpp    | 10 | 7  | 70.0   (physics translations)
-- typescript | 10 | 8 | 80.0
-- javascript | 10 | 8 | 80.0
-- java   | 10 | 6  | 60.0
```

## Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Frontend shows C# and C++ options
- [ ] Worker has new Docker images
- [ ] End-to-end publish flow works
- [ ] C# → C++ translation completes
- [ ] Physics conversion notes appear
- [ ] Tests pass in Docker
- [ ] Marketplace displays all 5 languages
- [ ] Purchase flow works
- [ ] Demo asset visible in marketplace
- [ ] No errors in logs (Netlify, Railway, Supabase)

## Success Criteria

**You'll know it's working when**:
1. You can publish a C# Unity asset from the live site
2. Worker picks it up and translates to C++
3. Tests run in Docker and pass
4. Asset appears in marketplace with green badges
5. Clicking on C++ variant shows physics conversion notes
6. You can purchase and receive the translated code

**Demo-ready state**:
- At least 1 C# asset in marketplace (Unity jump controller)
- All 5 language variants showing (at least C# and C++ passed)
- No errors in console or logs
- Purchase flow completes successfully

## Timeline

| Task | Duration | Status |
|------|----------|--------|
| Database migration | 5 min | ⏳ |
| Seed demo asset | 2 min | ⏳ |
| Deploy frontend (Netlify) | 3 min | ⏳ |
| Deploy worker (Railway) | 10 min | ⏳ |
| End-to-end test | 10 min | ⏳ |
| **Total** | **~30 min** | ⏳ |

## Next Steps After Deployment

1. **Create more demo assets**:
   - Projectile system (ballistic physics)
   - Vehicle controller (acceleration/friction)
   - Grappling hook (rope physics)

2. **Marketing**:
   - Record screen demo video
   - Post on Twitter/X with demo link
   - Share in Unity/Unreal Discord servers
   - Submit to Product Hunt

3. **Investor outreach**:
   - Send live demo link
   - Include DEMO_SUMMARY.md
   - Schedule calls to walk through

4. **User feedback**:
   - Monitor which languages get purchased most
   - Track translation success rates
   - Collect feedback on physics accuracy

---

**Ready to deploy?** Start with Step 1 and work through each section. The entire process takes ~30 minutes.

**Questions or issues?** Check the Troubleshooting section or review EXPANSION_PLAN.md for technical details.

🚀 **Let's make Singularity live!**
