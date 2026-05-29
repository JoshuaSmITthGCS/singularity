#!/usr/bin/env bash
set -euo pipefail

supabase gen types typescript --local > src/types/database.ts
