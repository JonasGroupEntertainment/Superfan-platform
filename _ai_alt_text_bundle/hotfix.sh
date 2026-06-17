#!/usr/bin/env bash
# All-in-one for AI alt-text (FE):
#   1. Install lib/alt-text/generate.ts + api route + AltTextSuggester component
#   2. Patch new-post-form.tsx — import + render after CaptionSuggester
#   3. Patch createPostAction — read image_alt from formData, include in insert
#   4. Type-check
#   5. Stage ALL new + modified files (avoid TagSuggester's git-add scope bug)
#   6. Commit
#
# Phase 2 (deferred): patch post-card to render alt attribute.
# Idempotent. Safe to re-run.

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/fan-engage"
cd "$REPO"

echo "── 1. Install files"
mkdir -p frontend/lib/alt-text
cp "$DIR/lib_alt.ts" frontend/lib/alt-text/generate.ts

mkdir -p frontend/app/api/ai/alt-text
cp "$DIR/api_route.ts" frontend/app/api/ai/alt-text/route.ts

mkdir -p frontend/components/community
cp "$DIR/alt_text_suggester.tsx" frontend/components/community/alt-text-suggester.tsx
echo "  · installed lib/alt-text/generate.ts, /api/ai/alt-text/route.ts, components/community/alt-text-suggester.tsx"

echo
echo "── 2. Patch new-post-form.tsx"
COMPOSER="$REPO/frontend/app/artists/[slug]/community/new-post-form.tsx"
[ -f "$COMPOSER" ] || { echo "  ! $COMPOSER not found"; exit 1; }

python3 - "$COMPOSER" <<'PY'
import re
import sys
from pathlib import Path

target = Path(sys.argv[1])
src = target.read_text()

# 1) Add import directly after CaptionSuggester import (we know it exists on FE)
if "AltTextSuggester" in src:
    print("  · AltTextSuggester already imported/rendered; skipping composer patch")
    raise SystemExit(0)

caption_import_re = re.compile(
    r'^(import\s+CaptionSuggester\s+from\s+[\"\'][^\"\']+[\"\'];?)\s*$',
    re.MULTILINE,
)
m = caption_import_re.search(src)
if not m:
    raise SystemExit(
        "  ! couldn't find CaptionSuggester import line; aborting composer patch"
    )
src = src[:m.end()] + (
    '\nimport AltTextSuggester from "@/components/community/alt-text-suggester";'
) + src[m.end():]

# 2) Render <AltTextSuggester /> after the entire CaptionSuggester JSX block
#    Anchor: "onUsedChange={setCaptionUsed}" (unique on FE) … through next ")}"
caption_block_re = re.compile(
    r'(onUsedChange=\{setCaptionUsed\}.*?\)\})',
    re.DOTALL,
)
m = caption_block_re.search(src)
if not m:
    raise SystemExit(
        "  ! couldn't find CaptionSuggester JSX block; aborting composer patch"
    )

inject = (
    "\n          {/* AI alt-text — auto-fires on upload, fan can edit */}\n"
    "          {imageUrl && (\n"
    "            <AltTextSuggester\n"
    "              imageUrl={imageUrl}\n"
    "              artistSlug={artistSlug}\n"
    "              partialBody={body}\n"
    "            />\n"
    "          )}"
)
src = src[:m.end()] + inject + src[m.end():]

target.write_text(src)
print(f"  + patched {target.name} (import + render)")
PY

echo
echo "── 3. Patch createPostAction (capture image_alt + insert)"
ACTIONS="$REPO/frontend/app/artists/[slug]/community/actions.ts"
[ -f "$ACTIONS" ] || { echo "  ! $ACTIONS not found"; exit 1; }

python3 - "$ACTIONS" <<'PY'
import re
import sys
from pathlib import Path

target = Path(sys.argv[1])
src = target.read_text()

MARKER = "AI alt-text — capture fan-edited image_alt"

if MARKER in src:
    print(f"  · {target.name} already patched; skipping")
    raise SystemExit(0)

# 1) Insert capture block after the first formData.get("body") line
CAPTURE = f"""
  // {MARKER}
  const imageAltRaw = String(formData.get("image_alt") ?? "").trim();
  const imageAlt = imageAltRaw.length > 0 ? imageAltRaw.slice(0, 500) : null;
"""

body_re = re.compile(r'(formData\.get\("body"\)[^\n]*\n)')
m = body_re.search(src)
if not m:
    raise SystemExit("  ! couldn't find formData.get(\"body\") anchor")
src = src[:m.end()] + CAPTURE + src[m.end():]

# 2) Add image_alt to the .from("community_posts").insert({ … }) payload
insert_re = re.compile(
    r'\.from\("community_posts"\)\s*\.insert\(\s*\{(.*?)\}\s*\)',
    re.DOTALL,
)
cm = insert_re.search(src)
if not cm:
    target.write_text(src)
    print("  · capture block inserted but no insert call found; manual merge needed")
    raise SystemExit(0)

payload = cm.group(1)
if "image_alt:" in payload:
    print("  · insert payload already has image_alt; capture block added")
    target.write_text(src)
    raise SystemExit(0)

stripped = payload.rstrip()
sep = " " if stripped.endswith(",") else ", "
new_payload = stripped + sep + "image_alt: imageAlt"
src = src[:cm.start()] + ".from(\"community_posts\").insert({" + new_payload + "})" + src[cm.end():]

target.write_text(src)
print(f"  + patched {target.name} (capture + insert)")
PY

echo
echo "── 4. Type-check"
cd "$REPO/frontend"
if grep -q '"typecheck"' package.json; then
  npm run typecheck
else
  npx tsc --noEmit
fi

cd "$REPO"
echo
echo "── 5. Stage all new + modified files (explicit list)"
git add frontend/lib/alt-text/generate.ts \
        frontend/components/community/alt-text-suggester.tsx \
        frontend/app/api/ai/alt-text/ \
        frontend/app/artists/\[slug\]/community/new-post-form.tsx \
        frontend/app/artists/\[slug\]/community/actions.ts || true
git status --short

echo
echo "── 6. Commit"
if ! git diff --cached --quiet; then
  git commit -m "feat(ai): alt-text — Claude vision generates accessibility alt for image posts"
  echo
  echo "✓ Bundle applied. Push: git push"
else
  echo "  · nothing to commit"
fi
