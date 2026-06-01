#!/bin/bash
set -e

echo "🚀 Singularity Deployment Script"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CLIs are installed
echo -e "${BLUE}Checking CLI tools...${NC}"
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: brew install supabase/tap/supabase"
    exit 1
fi
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Install with: brew install netlify-cli"
    exit 1
fi
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install with: brew install gh"
    exit 1
fi
echo -e "${GREEN}✓ All CLI tools installed${NC}"
echo ""

# Step 1: Supabase Setup
echo -e "${BLUE}Step 1: Supabase Setup${NC}"
echo "======================================"
echo ""

read -p "Do you want to create a new Supabase project? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating Supabase project..."
    echo "Note: You'll need to create the project via the web UI at https://supabase.com/dashboard"
    echo "After creating, run: supabase login"
    read -p "Press enter when you've created the project and logged in..."

    read -p "Enter your project reference (from project settings): " PROJECT_REF

    echo "Linking local project to Supabase..."
    supabase link --project-ref "$PROJECT_REF"

    echo "Pushing database migrations..."
    supabase db push

    echo -e "${GREEN}✓ Supabase project set up${NC}"
else
    echo "Skipping Supabase setup"
fi
echo ""

# Step 2: Get Supabase credentials
echo -e "${BLUE}Step 2: Get Supabase Credentials${NC}"
echo "======================================"
echo "Go to your Supabase project settings:"
echo "1. Project Settings → API"
echo "2. Copy the Project URL and anon public key"
echo ""
read -p "Press enter when ready to continue..."
echo ""

# Step 3: Netlify Setup
echo -e "${BLUE}Step 3: Netlify Deployment${NC}"
echo "======================================"
echo ""

read -p "Do you want to deploy to Netlify now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Logging into Netlify..."
    netlify login

    echo "Initializing Netlify site..."
    netlify init

    echo -e "${YELLOW}Next, configure environment variables in Netlify UI:${NC}"
    echo "1. Go to your site in Netlify dashboard"
    echo "2. Site Settings → Environment Variables"
    echo "3. Add all variables from .env.local.example"
    echo ""
    read -p "Press enter when you've configured environment variables..."

    echo "Deploying to Netlify..."
    netlify deploy --prod

    echo -e "${GREEN}✓ Deployed to Netlify${NC}"
else
    echo "Skipping Netlify deployment"
fi
echo ""

# Step 4: GitHub App Setup
echo -e "${BLUE}Step 4: GitHub App Setup${NC}"
echo "======================================"
echo "Create a GitHub App:"
echo "1. Go to https://github.com/settings/apps/new"
echo "2. Fill in the form with your Netlify and Supabase URLs"
echo "3. Set permissions: Contents (read/write), Pull requests (read/write)"
echo "4. Copy App ID, Client ID, Client Secret, and Private Key"
echo ""
read -p "Press enter when you've created the GitHub App..."
echo ""

# Step 5: Railway Worker Setup
echo -e "${BLUE}Step 5: Worker Deployment (Railway)${NC}"
echo "======================================"
echo "The worker needs to be deployed separately to Railway, Render, or Fly.io"
echo ""
echo "For Railway:"
echo "1. Go to https://railway.app"
echo "2. Create new project"
echo "3. Connect this repository"
echo "4. Set root directory: worker"
echo "5. Build: pnpm install && pnpm run build:images"
echo "6. Start: pnpm dev"
echo "7. Add same environment variables as Netlify"
echo ""
echo "For Render:"
echo "1. Go to https://render.com"
echo "2. New → Background Worker"
echo "3. Connect repository, root dir: worker"
echo "4. Build: pnpm install && pnpm run build:images"
echo "5. Start: pnpm dev"
echo ""
read -p "Press enter when you've deployed the worker..."
echo ""

# Final steps
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update GitHub App URLs with your Netlify domain"
echo "2. Configure Supabase Auth with GitHub provider"
echo "3. Test the full flow: publish → translate → purchase"
echo ""
echo "See DEPLOYMENT_SUMMARY.md for detailed testing checklist"
