#!/usr/bin/env bash
# Alt-text Phase 2:
#   1. Install backfill cron route
#   2. Add cron entry to vercel.json
#   3. Patch type definition
#   4. Patch select strings
#   5. Patch render JSX (post-card etc.)
#   6. Type-check
#   7. Stage + commit

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install backfill cron route"
mkdir -p frontend/app/api/cron/alt-text-backfill
cp "$DIR/cron_route.ts" frontend/app/api/cron/alt-text-backfill/route.ts

echo
echo "── 2. Patch vercel.json"
python3 "$DIR/patch_vercel_json.py"

echo
echo "── 3. Patch CommunityPost type"
python3 "$DIR/patch_types.py" || echo "  (types patch reported issue — see above)"

echo
echo "── 4. Patch select strings"
python3 "$DIR/patch_select.py" || echo "  (select patch reported issue — see above)"

echo
echo "── 5. Patch render JSX"
python3 "$DIR/patch_render.py" || echo "  (render patch reported issue — see above)"

echo
echo "── 6. Type-check"
cd frontend
if grep -q '"typecheck"' package.json; then
  npm run typecheck
else
  npx tsc --noEmit
fi

cd "$REPO"
echo
echo "── 7. Stage all changes"
git add frontend/app/api/cron/alt-text-backfill/ \
        frontend/vercel.json
git add -A frontend/lib frontend/app frontend/components 2>/dev/null || true
git status --short

echo
if ! git diff --cached --quiet; then
  git commit -m "feat(ai): alt-text phase 2 — render alt prop + backfill cron"
  echo
  echo "✓ Phase 2 applied. Push: git push"
  echo
  echo "After deploy, manually trigger the backfill once via Vercel:"
  echo "  https://vercel.com/jonas-group/fan-engage/settings/cron-jobs"
  echo "  → Run on /api/cron/alt-text-backfill"
else
  echo "  · nothing to commit"
fi
