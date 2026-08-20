#!/usr/bin/env bash
set -euo pipefail

# Production: CONVEX_DEPLOY_KEY runs `npx convex deploy` and injects
# NEXT_PUBLIC_CONVEX_URL into the Next build.
# Holding page: no deploy key, so skip Convex and still produce a Next build.
if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  exec npx convex deploy --cmd 'npm run build'
fi

echo "CONVEX_DEPLOY_KEY is unset; building Next without deploying Convex."
exec npm run build
