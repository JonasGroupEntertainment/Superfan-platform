#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install /api/cron/post-drafts/route.ts"
mkdir -p frontend/app/api/cron/post-drafts
cp "$DIR/cron_route.ts" frontend/app/api/cron/post-drafts/route.ts

echo
echo "── 2. Patch frontend/vercel.json (add cron entry)"
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
echo "── 4. Commit"
git add frontend/app/api/cron/post-drafts/route.ts frontend/vercel.json
git status --short
git commit -m "feat(ai): #18 cron — auto-generate artist post drafts daily"
echo
echo "✓ Bundle applied. Push: git push"
echo
echo "After deploy, smoke test:"
echo "  curl -H \"Authorization: Bearer \$CRON_SECRET\" \\"
echo "    https://fan-engage-pearl.vercel.app/api/cron/post-drafts"
