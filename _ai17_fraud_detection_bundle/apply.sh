#!/usr/bin/env bash
# AI #17 fraud detection v1 (FE).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install lib + cron + admin page"
mkdir -p frontend/lib/fraud-detection
cp "$DIR/lib_detect.ts" frontend/lib/fraud-detection/index.ts

mkdir -p frontend/app/api/cron/fraud-scan
cp "$DIR/cron_route.ts" frontend/app/api/cron/fraud-scan/route.ts

mkdir -p frontend/app/admin/fraud-signals
cp "$DIR/admin_page.tsx" frontend/app/admin/fraud-signals/page.tsx
cp "$DIR/admin_actions.ts" frontend/app/admin/fraud-signals/actions.ts
echo "  · installed lib + cron + admin page + actions"

echo
echo "── 2. Patch vercel.json"
python3 "$DIR/patch_vercel_json.py"

echo
echo "── 3. Type-check"
cd frontend
if grep -q '"typecheck"' package.json; then
  npm run typecheck
else
  npx tsc --noEmit
fi

cd "$REPO"
echo
echo "── 4. Stage + commit"
git add frontend/lib/fraud-detection/ \
        frontend/app/api/cron/fraud-scan/ \
        frontend/app/admin/fraud-signals/ \
        frontend/vercel.json
git add -A frontend/app frontend/lib 2>/dev/null || true
git status --short

if ! git diff --cached --quiet; then
  git commit -m "feat(ai): #17 fraud detection v1 — heuristics + Claude verdict + admin queue"
  echo "✓ Committed. Push: git push"
fi
