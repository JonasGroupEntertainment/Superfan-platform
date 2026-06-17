#!/usr/bin/env bash
# AI moderation explainer (FE):
#   1. Install lib/moderation/explain-user.ts + cron route + ModerationChip
#   2. Patch vercel.json (cron entry)
#   3. Patch CommunityPost type
#   4. Patch select strings
#   5. Patch post-card render
#   6. Type-check
#   7. Stage + commit (explicit list to avoid git-add scope bug)

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install files"
mkdir -p frontend/lib/moderation
cp "$DIR/lib_explain.ts" frontend/lib/moderation/explain-user.ts

mkdir -p frontend/app/api/cron/moderation-explain
cp "$DIR/cron_route.ts" frontend/app/api/cron/moderation-explain/route.ts

mkdir -p frontend/components/community
cp "$DIR/mod_chip.tsx" frontend/components/community/moderation-chip.tsx

echo "  · installed lib/moderation/explain-user.ts, /api/cron/moderation-explain/route.ts, components/community/moderation-chip.tsx"

echo
echo "── 2. Patch vercel.json"
python3 "$DIR/patch_vercel_json.py"

echo
echo "── 3. Patch CommunityPost type"
python3 "$DIR/patch_types.py" || echo "  (types patch reported issue)"

echo
echo "── 4. Patch select strings"
python3 "$DIR/patch_select.py" || echo "  (select patch reported issue)"

echo
echo "── 5. Patch post-card render"
python3 "$DIR/patch_post_card.py" || echo "  (post-card patch reported issue)"

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
echo "── 7. Stage all new + modified files"
git add frontend/lib/moderation/explain-user.ts \
        frontend/components/community/moderation-chip.tsx \
        frontend/app/api/cron/moderation-explain/ \
        frontend/vercel.json \
        frontend/lib/data/types.ts \
        frontend/lib/data/community.ts \
        frontend/app/artists/\[slug\]/community/post-card.tsx
# Catch any other modified files in those dirs (e.g. admin pages with selects)
git add -A frontend/app frontend/lib 2>/dev/null || true
git status --short

echo
if ! git diff --cached --quiet; then
  git commit -m "feat(ai): moderation explainer — fan-facing reason chip on auto-hidden posts"
  echo
  echo "✓ Bundle applied. Push: git push"
  echo
  echo "After deploy, smoke test (see README — needs SQL flip + cron Run):"
  echo "  https://vercel.com/jonas-group/fan-engage/settings/cron-jobs"
  echo "  → Run /api/cron/moderation-explain"
else
  echo "  · nothing to commit"
fi
