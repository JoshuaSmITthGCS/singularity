#!/usr/bin/env bash
set -euo pipefail

pnpm install
cp -n .env.local.example .env.local || true
supabase start
supabase db reset
pnpm run generate-types
