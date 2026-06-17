#!/usr/bin/env bash
# AI #7 Personalized feed v1 (FE):
#   1. Install lib + component
#   2. Wire into community page
#   3. Type-check
#   4. Commit
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install files"
mkdir -p frontend/lib/personal-feed
cp "$DIR/lib_compute.ts" frontend/lib/personal-feed/compute.ts

mkdir -p frontend/components/personal
cp "$DIR/picked_for_you.tsx" frontend/components/personal/picked-for-you.tsx
echo "  · installed lib/personal-feed/compute.ts + components/personal/picked-for-you.tsx"

echo
echo "── 2. Wire <PickedForYou /> into artist community page"
python3 "$DIR/patch_community_page.py" || echo "  (patch reported issue — see above)"

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
git add frontend/lib/personal-feed/ \
        frontend/components/personal/ \
        frontend/app/artists/\[slug\]/community/page.tsx
git add -A frontend/app frontend/lib frontend/components 2>/dev/null || true
git status --short

if ! git diff --cached --quiet; then
  git commit -m "feat(ai): #7 personalized feed v1 — Picked for You tile on community page"
  echo "✓ Committed. Push: git push"
else
  echo "  · nothing to commit"
fi
