#!/usr/bin/env bash
# Hotfix for the AI #5 tag suggester bundle:
#   1. Wire <TagSuggester /> into the right composer file (new-post-form.tsx)
#   2. Re-typecheck, commit, push
#
# Re-runnable. Idempotent (skips if TagSuggester is already present).

set -euo pipefail
REPO="$HOME/fan-engage"
TARGET="$REPO/frontend/app/artists/[slug]/community/new-post-form.tsx"

if [ ! -f "$TARGET" ]; then
  echo "  ! $TARGET does not exist; aborting"
  exit 1
fi

if grep -q "TagSuggester" "$TARGET"; then
  echo "  · $TARGET already references TagSuggester; nothing to do"
else
  python3 - <<'PY'
from pathlib import Path
import re

target = Path.home() / "fan-engage/frontend/app/artists/[slug]/community/new-post-form.tsx"
src = target.read_text()

# 1) Add import directly after CaptionSuggester import
src = src.replace(
    'import CaptionSuggester from "./caption-suggester";',
    'import CaptionSuggester from "./caption-suggester";\n'
    'import TagSuggester from "@/components/community/tag-suggester";',
)

# 2) Insert <TagSuggester /> after the caption_used hidden input.
old = '<input type="hidden" name="caption_used" value={captionUsed ? "1" : "0"} />'
new = (
    old
    + "\n\n"
    "      {/* AI #5 — TagSuggester (lights M-2 filter chips on submit) */}\n"
    "      <TagSuggester partialBody={body} artistSlug={artistSlug} />"
)
if old not in src:
    raise SystemExit(f"  ! anchor not found: {old!r}")
src = src.replace(old, new, 1)

target.write_text(src)
print(f"  + patched {target.relative_to(Path.home())}")
PY
fi

echo
echo "── Type-check"
cd "$REPO/frontend"
if grep -q '"typecheck"' package.json; then
  npm run typecheck
else
  npx tsc --noEmit
fi

cd "$REPO"
echo
echo "── Commit"
git add frontend/app/api/ai/suggest-tags/route.ts \
        frontend/app/artists/\[slug\]/community/new-post-form.tsx \
        frontend/app/artists/\[slug\]/community/actions.ts || true
git status --short
if ! git diff --cached --quiet; then
  git commit -m "fix(ai): #5 wire TagSuggester to new-post-form + import hotfix"
  echo
  echo "✓ Hotfix committed. Push: git push"
else
  echo "  · nothing to commit"
fi
