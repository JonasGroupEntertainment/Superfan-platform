#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install lib/tagging/suggest.ts"
mkdir -p frontend/lib/tagging
cp "$DIR/lib_suggest.ts" frontend/lib/tagging/suggest.ts

echo
echo "── 2. Install /api/ai/suggest-tags/route.ts"
mkdir -p frontend/app/api/ai/suggest-tags
cp "$DIR/api_route.ts" frontend/app/api/ai/suggest-tags/route.ts

echo
echo "── 3. Install components/community/tag-suggester.tsx"
mkdir -p frontend/components/community
cp "$DIR/tag_suggester.tsx" frontend/components/community/tag-suggester.tsx

echo
echo "── 4. Patch new-post composer (find target + render <TagSuggester />)"
python3 "$DIR/patch_composer.py" || echo "  (composer patch reported issue — see above)"

echo
echo "── 5. Patch createPostAction (capture ai_suggested_tags + merge)"
python3 "$DIR/patch_actions.py" || echo "  (actions patch reported issue — see above)"

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
echo "── 7. Commit"
git add frontend/lib/tagging/suggest.ts \
        frontend/app/api/ai/suggest-tags/ \
        frontend/components/community/tag-suggester.tsx
# Composer + actions may or may not have changed depending on patch hits
git add -A frontend/app frontend/components 2>/dev/null || true
git status --short
git commit -m "feat(ai): #5 fan-facing tag suggester on post composer"
echo
echo "✓ Bundle applied. Push: git push"
echo
echo "Smoke test:"
echo "  1. Visit https://fan-engage-pearl.vercel.app/artists/raelynn/community"
echo "  2. Open the composer, type a post body about a tour date"
echo "  3. Click \"✨ Suggest tags\""
echo "  4. Toggle chips, then submit"
echo "  5. Confirm post renders with the chosen tags"
