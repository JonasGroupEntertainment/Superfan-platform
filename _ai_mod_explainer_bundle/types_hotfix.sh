#!/usr/bin/env bash
# CommunityPost in types.ts is missing moderation_status entirely.
# Add both moderation_status and moderation_user_message after the
# image_alt line (which we know exists from alt-text Phase 2).
set -euo pipefail
TARGET="$HOME/fan-engage/frontend/lib/data/types.ts"
[ -f "$TARGET" ] || { echo "  ! $TARGET not found"; exit 1; }

python3 - "$TARGET" <<'PY'
import sys
from pathlib import Path

target = Path(sys.argv[1])
src = target.read_text()

# Idempotency: if both fields already present in the same type block,
# we're done.
already_status = "moderation_status:" in src
already_msg = "moderation_user_message:" in src
if already_status and already_msg:
    print("  · both moderation fields already in types.ts; nothing to do")
    raise SystemExit(0)

lines = src.splitlines(keepends=True)
new_lines: list[str] = []
added = 0
i = 0
while i < len(lines):
    new_lines.append(lines[i])
    stripped = lines[i].strip()
    # Anchor on image_alt (added in alt-text Phase 2). Insert moderation
    # fields right after, but only ONCE (in the CommunityPost-shaped
    # type that already has image_alt). Subsequent image_alt lines (if
    # any) are skipped.
    if added == 0 and stripped.startswith("image_alt") and ":" in stripped:
        indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())]
        if not already_status:
            new_lines.append(f"{indent}moderation_status: string | null;\n")
        if not already_msg:
            new_lines.append(f"{indent}moderation_user_message: string | null;\n")
        added = 1
    i += 1

if added == 0:
    raise SystemExit("  ! couldn't find image_alt anchor in types.ts; manual edit needed")

target.write_text("".join(new_lines))
print(f"  + added moderation_status + moderation_user_message after image_alt")
PY

cd "$HOME/fan-engage/frontend"
echo
echo "── Type-check"
if grep -q '"typecheck"' package.json; then
  npm run typecheck
else
  npx tsc --noEmit
fi

cd "$HOME/fan-engage"
echo
echo "── Stage all moderation-explainer files + types fix"
git add frontend/lib/moderation/explain-user.ts \
        frontend/components/community/moderation-chip.tsx \
        frontend/app/api/cron/moderation-explain/ \
        frontend/vercel.json \
        frontend/lib/data/types.ts \
        frontend/lib/data/community.ts \
        frontend/app/artists/\[slug\]/community/post-card.tsx
git add -A frontend/app frontend/lib 2>/dev/null || true
git status --short

echo
if ! git diff --cached --quiet; then
  git commit -m "feat(ai): moderation explainer — fan-facing reason chip + types fix"
  echo "✓ Committed. Push: git push"
else
  echo "  · nothing to commit"
fi
