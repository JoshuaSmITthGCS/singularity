#!/bin/bash

# Singularity Quick Deploy Script
# This script helps you deploy Singularity step-by-step using CLIs

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Singularity Quick Deploy Script    ║"
echo "╔═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Supabase
echo -e "${BLUE}Step 1: Supabase Setup${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "First, create a Supabase project:"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Click 'New project'"
echo "3. Name: singularity"
echo "4. Choose password and region"
echo "5. Wait ~2 minutes for creation"
echo ""
read -p "Press Enter when you've created the project..."
echo ""

echo "Now let's link your local project to Supabase..."
echo ""

# Supabase login
echo -e "${YELLOW}Logging into Supabase...${NC}"
supabase login

echo ""
read -p "Enter your project ref (from URL: app.supabase.com/project/YOUR-REF): " PROJECT_REF

echo ""
echo -e "${YELLOW}Linking project...${NC}"
supabase link --project-ref "$PROJECT_REF"

echo ""
echo -e "${YELLOW}Pushing database migrations...${NC}"
supabase db push

echo ""
echo -e "${GREEN}✓ Supabase setup complete!${NC}"
echo ""
echo "Now get your credentials:"
echo "1. Go to Project Settings → API"
echo "2. Copy these values to a text file:"
echo "   - Project URL"
echo "   - anon public key"
echo "   - service_role key (click 'Service role' tab)"
echo ""
read -p "Press Enter when you've copied the credentials..."
echo ""

# Step 2: GitHub App
echo -e "${BLUE}Step 2: GitHub App Setup${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "Create a GitHub App:"
echo "1. Go to: https://github.com/settings/apps/new"
echo "2. Fill in the form (use temporary URLs for now):"
echo ""
echo "   Name: Singularity Dev"
echo "   Homepage: http://localhost:3000"
echo "   Callback: https://$PROJECT_REF.supabase.co/auth/v1/callback"
echo "   Webhook: http://localhost:3000/api/webhooks/github"
echo ""
echo "3. Generate webhook secret:"
openssl rand -hex 32
echo ""
echo "   ^ Copy this as your webhook secret"
echo ""
echo "4. Set permissions:"
echo "   - Repository: Contents (read/write), Pull requests (read/write), Metadata (read)"
echo "   - Account: Email (read)"
echo ""
echo "5. Subscribe to: Installation events"
echo "6. Click 'Create GitHub App'"
echo ""
read -p "Press Enter when you've created the GitHub App..."
echo ""

read -p "Enter GitHub App ID: " GITHUB_APP_ID
read -p "Enter GitHub App slug: " GITHUB_APP_SLUG
read -p "Enter GitHub App Client ID: " GITHUB_APP_CLIENT_ID
read -p "Enter GitHub App Client Secret: " GITHUB_APP_CLIENT_SECRET
read -p "Enter webhook secret (the one generated above): " GITHUB_WEBHOOK_SECRET

echo ""
echo "Download the private key from GitHub App settings"
echo "Then run this command with the path to your downloaded .pem file:"
echo ""
echo "cat ~/Downloads/your-app.*.private-key.pem | awk 'NF {sub(/\r/, \"\"); printf \"%s\\\\n\",\$0;}'"
echo ""
read -p "Press Enter to continue..."
echo ""

# Step 3: Netlify
echo -e "${BLUE}Step 3: Netlify Deployment${NC}"
echo "═══════════════════════════════════════"
echo ""

echo -e "${YELLOW}Logging into Netlify...${NC}"
netlify login

echo ""
echo -e "${YELLOW}Initializing Netlify site...${NC}"
netlify init

echo ""
echo "Great! Now let's set environment variables..."
echo ""

read -p "Enter NEXT_PUBLIC_SUPABASE_URL (from Step 1): " SUPABASE_URL
read -p "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY (from Step 1): " SUPABASE_ANON_KEY
read -p "Enter SUPABASE_SERVICE_ROLE_KEY (from Step 1): " SUPABASE_SERVICE_KEY
read -p "Enter OPENAI_API_KEY: " OPENAI_KEY
read -p "Enter GITHUB_APP_PRIVATE_KEY (converted to one line): " GITHUB_PRIVATE_KEY

echo ""
echo -e "${YELLOW}Setting environment variables...${NC}"

netlify env:set NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_KEY"
netlify env:set OPENAI_API_KEY "$OPENAI_KEY"
netlify env:set GITHUB_APP_ID "$GITHUB_APP_ID"
netlify env:set GITHUB_APP_SLUG "$GITHUB_APP_SLUG"
netlify env:set GITHUB_APP_CLIENT_ID "$GITHUB_APP_CLIENT_ID"
netlify env:set GITHUB_APP_CLIENT_SECRET "$GITHUB_APP_CLIENT_SECRET"
netlify env:set GITHUB_APP_PRIVATE_KEY "$GITHUB_PRIVATE_KEY"
netlify env:set GITHUB_APP_WEBHOOK_SECRET "$GITHUB_WEBHOOK_SECRET"

echo ""
echo -e "${YELLOW}Deploying to Netlify...${NC}"
netlify deploy --prod

echo ""
NETLIFY_URL=$(netlify status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Deployed to: $NETLIFY_URL${NC}"
echo ""

# Set the app URL
netlify env:set NEXT_PUBLIC_APP_URL "$NETLIFY_URL"

echo ""
echo -e "${BLUE}Step 4: Update GitHub App URLs${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "Update your GitHub App with these URLs:"
echo "  Homepage: $NETLIFY_URL"
echo "  Webhook: $NETLIFY_URL/api/webhooks/github"
echo "  Setup: $NETLIFY_URL/dashboard"
echo ""
echo "Go to: https://github.com/settings/apps"
echo "Select your app and update the URLs"
echo ""
read -p "Press Enter when you've updated the GitHub App..."
echo ""

echo -e "${BLUE}Step 5: Configure Supabase Auth${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "Configure GitHub authentication in Supabase:"
echo "1. Go to: Supabase Dashboard → Authentication → Providers"
echo "2. Enable GitHub provider"
echo "3. Enter:"
echo "   - Client ID: $GITHUB_APP_CLIENT_ID"
echo "   - Client Secret: $GITHUB_APP_CLIENT_SECRET"
echo "4. Save"
echo ""
echo "5. Go to: Authentication → URL Configuration"
echo "6. Set Site URL: $NETLIFY_URL"
echo "7. Add Redirect URL: $NETLIFY_URL/**"
echo "8. Save"
echo ""
read -p "Press Enter when you've configured Supabase Auth..."
echo ""

echo -e "${BLUE}Step 6: Deploy Worker${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "The worker needs to be deployed to Railway, Render, or Fly.io"
echo ""
echo "Option 1: Railway (Recommended)"
echo "  1. Install Railway CLI (if needed): brew install railway"
echo "  2. cd worker"
echo "  3. railway login"
echo "  4. railway init"
echo "  5. Set environment variables (same as Netlify)"
echo "  6. railway up"
echo ""
echo "Option 2: Use Railway Web UI"
echo "  1. Go to: https://railway.app"
echo "  2. New Project → Deploy from GitHub"
echo "  3. Select repository, root dir: worker"
echo "  4. Add environment variables"
echo "  5. Deploy"
echo ""
echo "See CLI_DEPLOYMENT.md for detailed worker deployment steps"
echo ""
read -p "Press Enter when you've deployed the worker..."
echo ""

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════╗"
echo "║   🎉 Deployment Complete!             ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Your Singularity marketplace is live at:"
echo -e "${BLUE}$NETLIFY_URL${NC}"
echo ""
echo "Next steps:"
echo "1. Visit your site and sign in with GitHub"
echo "2. Install the GitHub App"
echo "3. Publish a test asset"
echo "4. Watch worker logs to see translations"
echo "5. Check marketplace for your asset"
echo ""
echo "Useful commands:"
echo "  netlify open              - Open site in browser"
echo "  netlify logs              - View logs"
echo "  cd worker && railway logs - View worker logs"
echo ""
echo "See DEPLOY_NOW.md for detailed testing instructions"
echo ""
