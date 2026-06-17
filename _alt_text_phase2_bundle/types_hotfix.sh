#!/usr/bin/env bash
# Adds `image_alt: string | null;` after EVERY `image_url: string | null;`
# line in types.ts that isn't already followed by it. Idempotent.
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
    if stripped.startswith("image_url") and "string" in stripped:
        # Look at next non-blank line; if it's already image_alt, skip
        j = i + 1
        next_line = lines[j] if j < len(lines) else ""
        if next_line.strip().startswith("image_alt"):
            i += 1
            continue
        # Inject image_alt with same indentation as image_url line
        indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())]
        out.append(f"{indent}image_alt: string | null;\n")
        added += 1
    i += 1

target.write_text("".join(out))
print(f"  + added image_alt after {added} image_url declaration(s)")
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
git add frontend/lib/data/types.ts
if ! git diff --cached --quiet; then
  git commit -m "fix(ai): alt-text — add image_alt to all CommunityPost-shaped types"
  echo "✓ Committed. Push: git push"
else
  echo "  · nothing to commit"
fi
