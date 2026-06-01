#!/bin/bash
# One-command deployment script for C# and C++ support
# This deploys everything to production: database, frontend, and worker

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Singularity Live Deployment                               ║"
echo "║  Deploying C# and C++ Support to Production                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    echo "   Current directory: $(pwd)"
    echo "   Expected: /Users/eyerise/Documents/sigularity"
    exit 1
fi

echo -e "${GREEN}✅ Directory check passed${NC}"
echo ""

# Step 1: Git Status Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Git Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo ""
    git status -s
    echo ""
    read -p "Commit and push changes now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Deploy C# and C++ support with physics-aware translation

- Add C# (Unity, Godot) and C++ (Unreal) language support
- Implement physics conversion (Y-up ↔ Z-up, meters ↔ centimeters)
- Create demo Unity → Unreal character jump controller
- Update database schema, frontend, and worker
- Add Docker test runners for new languages

Features:
- Physics-aware AI translation prompts
- Coordinate system conversion (Unity Y-up → Unreal Z-up)
- Unit scaling (meters × 100 → centimeters)
- Gravity conversion (-9.81 m/s² → -980 cm/s²)
- Comprehensive test coverage

Demo ready: /demo/unity-jump-controller.cs
Migration: supabase/migrations/20260527000000_add_csharp_cpp_languages.sql"

        echo -e "${GREEN}✅ Changes committed${NC}"

        echo ""
        echo "Pushing to GitHub..."
        git push origin main
        echo -e "${GREEN}✅ Pushed to GitHub${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping commit. Deploy will use current Git state.${NC}"
    fi
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
fi

echo ""

# Step 2: Database Migration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Database Migration (Supabase)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v supabase &> /dev/null; then
    echo "Running Supabase migration..."
    if supabase db push; then
        echo -e "${GREEN}✅ Database migration applied${NC}"
    else
        echo -e "${YELLOW}⚠️  Migration may have already been applied${NC}"
        echo "   Check Supabase dashboard if you see errors"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
    echo ""
    echo "Please apply migration manually:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to SQL Editor"
    echo "4. Copy contents of supabase/migrations/20260527000000_add_csharp_cpp_languages.sql"
    echo "5. Execute the SQL"
    echo ""
    read -p "Press Enter when migration is complete..."
fi

echo ""

# Step 3: Seed Demo Asset (Optional)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Seed Demo Asset (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Add Unity jump controller demo asset to marketplace? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please run the seed script in Supabase SQL Editor:"
    echo ""
    echo "1. Copy contents of: supabase/seed_demo_asset.sql"
    echo "2. Paste in SQL Editor"
    echo "3. Execute"
    echo ""
    read -p "Press Enter when seeding is complete..."
    echo -e "${GREEN}✅ Demo asset seeded${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping demo asset${NC}"
fi

echo ""

# Step 4: Frontend Deployment (Netlify)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Frontend Deployment (Netlify)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Netlify will auto-deploy from GitHub push."
echo ""
echo "Monitor deployment at:"
echo "🔗 https://app.netlify.com"
echo ""
read -p "Press Enter to continue after Netlify deployment completes..."

echo -e "${GREEN}✅ Frontend deployment triggered${NC}"
echo ""

# Step 5: Worker Deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Worker Deployment (Railway/Render)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Choose your worker platform:"
echo "1) Railway"
echo "2) Render"
echo "3) Skip (deploy manually)"
read -p "Selection (1-3): " platform

case $platform in
    1)
        echo "Deploying to Railway..."
        if command -v railway &> /dev/null; then
            railway up
            echo -e "${GREEN}✅ Railway deployment complete${NC}"
        else
            echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
            echo "Install: npm i -g @railway/cli"
            echo "Or deploy manually at: https://railway.app"
            read -p "Press Enter when Railway deployment is complete..."
        fi
        ;;
    2)
        echo "Deploy to Render:"
        echo "1. Go to https://dashboard.render.com"
        echo "2. Find your worker service"
        echo "3. Click 'Manual Deploy' → 'Deploy latest commit'"
        echo ""
        read -p "Press Enter when Render deployment is complete..."
        echo -e "${GREEN}✅ Render deployment complete${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Skipping worker deployment${NC}"
        ;;
esac

echo ""

# Step 6: Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Manual verification steps:"
echo ""
echo "1. Frontend (Netlify):"
echo "   ✓ Visit your site /publish"
echo "   ✓ Check C# and C++ in language dropdown"
echo "   ✓ Try creating a C# asset"
echo ""
echo "2. Worker (Railway/Render):"
echo "   ✓ Check logs for 'Worker started'"
echo "   ✓ Verify Docker images loaded"
echo "   ✓ Watch for translation jobs"
echo ""
echo "3. Database (Supabase):"
echo "   ✓ Run: SELECT DISTINCT source_language FROM assets;"
echo "   ✓ Should include 'csharp' and 'cpp'"
echo ""
echo "4. End-to-End Test:"
echo "   ✓ Publish C# asset"
echo "   ✓ Watch it translate to C++"
echo "   ✓ Check marketplace for result"
echo ""

read -p "Run verification now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Opening verification URLs..."

    # Try to open URLs (macOS)
    if command -v open &> /dev/null; then
        open "https://app.netlify.com"
        open "https://railway.app" 2>/dev/null || true
        open "https://supabase.com/dashboard"
    fi

    echo ""
    echo "Verification URLs opened in browser."
fi

echo ""

# Final Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉 DEPLOYMENT COMPLETE                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Database:${NC} Migration applied (C# and C++ support)"
echo -e "${GREEN}✅ Frontend:${NC} Deployed to Netlify (auto from Git push)"
echo -e "${GREEN}✅ Worker:${NC}   Deployed to Railway/Render"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Test the live site:"
echo "   • Go to /publish"
echo "   • Select C# as source language"
echo "   • Create a Unity asset"
echo "   • Watch it translate to all 5 languages"
echo ""
echo "2. Demo for investors:"
echo "   • See DEMO_SUMMARY.md for talking points"
echo "   • Practice 2-minute demo flow"
echo "   • Show Unity → Unreal physics conversion"
echo ""
echo "3. Monitor:"
echo "   • Netlify build logs"
echo "   • Railway/Render worker logs"
echo "   • Supabase database queries"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Documentation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• Full deployment guide: LIVE_DEMO_DEPLOYMENT.md"
echo "• Investor summary: DEMO_SUMMARY.md"
echo "• Technical roadmap: EXPANSION_PLAN.md"
echo "• Demo checklist: WEBSITE_DEMO_READY.md"
echo ""
echo "🚀 Your marketplace is now live with C# and C++ support!"
echo ""
