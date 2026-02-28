#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting production deploy..."

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but not found."
  exit 1
fi

BACKEND_URL="$(node -p '(() => { try { const v = require("./vercel.json"); const r = (v.rewrites || []).find(x => x.source === "/api/(.*)"); return r ? String(r.destination).replace("/api/$1", "") : ""; } catch { return ""; } })()')"

echo "Deploying frontend on Vercel..."
VERCEL_OUTPUT="$(npx --yes vercel deploy --prod --yes --archive=tgz 2>&1 | tee /dev/stderr)"

FRONTEND_URL="$(printf '%s\n' "$VERCEL_OUTPUT" | grep -Eo 'https://[^[:space:]]+\.vercel\.app' | tail -n 1 || true)"

if [ -z "$FRONTEND_URL" ]; then
  echo "Error: Could not determine frontend URL from Vercel output."
  exit 1
fi

if [ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]; then
  echo "Triggering backend redeploy on Render..."
  curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL" >/dev/null
  echo "Backend redeploy trigger sent."
else
  echo "Skipping backend redeploy trigger (set RENDER_DEPLOY_HOOK_URL to enable)."
fi

echo "Running reachability checks..."
FRONTEND_STATUS="$(curl -s -o /tmp/deploy_frontend.out -w '%{http_code}' "$FRONTEND_URL")"

BACKEND_STATUS="n/a"
if [ -n "$BACKEND_URL" ]; then
  BACKEND_STATUS="$(curl -s -o /tmp/deploy_backend.out -w '%{http_code}' "$BACKEND_URL/api/health" || true)"
fi

echo ""
echo "Deploy complete"
echo "Frontend: $FRONTEND_URL (HTTP $FRONTEND_STATUS)"
if [ -n "$BACKEND_URL" ]; then
  echo "Backend:  $BACKEND_URL (health HTTP $BACKEND_STATUS)"
else
  echo "Backend:  not found in vercel.json rewrites"
fi
