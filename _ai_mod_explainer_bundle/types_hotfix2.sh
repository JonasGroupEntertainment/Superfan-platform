#!/usr/bin/env bash
# v2: add moderation_status + moderation_user_message after EVERY
# image_alt line that isn't already followed by moderation_status.
# Mirrors the all-occurrences pattern from alt-text Phase 2.
set -euo pipefail
TARGET="$HOME/fan-engage/frontend/lib/data/types.ts"
[ -f "$TARGET" ] || { echo "  ! $TARGET not found"; exit 1; }

python3 - "$TARGET" <<'PY'
import sys
from pathlib import Path

target = Path(sys.argv[1])
lines = target.read_text().splitlines(keepends=True)
out: list[str] = []
added = 0

i = 0
while i < len(lines):
    out.append(lines[i])
    stripped = lines[i].strip()
    if stripped.startswith("image_alt") and ":" in stripped:
        # Check the immediate next non-blank line; if it's already
        # moderation_status, skip.
        j = i + 1
        next_line = lines[j] if j < len(lines) else ""
        if next_line.strip().startswith("moderation_status"):
            i += 1
            continue
        # Inject both moderation fields with same indentation
        indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())]
        out.append(f"{indent}moderation_status: string | null;\n")
        out.append(f"{indent}moderation_user_message: string | null;\n")
        added += 1
    i += 1

target.write_text("".join(out))
print(f"  + added moderation_status + moderation_user_message after {added} image_alt declaration(s)")
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
echo "── Stage + commit"
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
  git commit -m "feat(ai): moderation explainer — fan-facing reason chip"
  echo "✓ Committed. Push: git push"
else
  echo "  · nothing to commit"
fi
