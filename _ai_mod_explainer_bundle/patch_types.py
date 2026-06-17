#!/usr/bin/env python3
"""
Add `moderation_user_message: string | null;` after EVERY
`moderation_status` line in lib/data/types.ts that doesn't already
have it. Mirrors the all-occurrences pattern from alt-text Phase 2.

Idempotent.
"""
from __future__ import annotations
import sys
from pathlib import Path

TARGET = Path.home() / "fan-engage" / "frontend" / "lib" / "data" / "types.ts"


def main() -> int:
    if not TARGET.exists():
        print(f"  ! {TARGET} not found")
        return 1
    lines = TARGET.read_text().splitlines(keepends=True)
    out: list[str] = []
    added = 0
    i = 0
    while i < len(lines):
        out.append(lines[i])
        stripped = lines[i].strip()
        if stripped.startswith("moderation_status") and ":" in stripped:
            # Check next non-blank line
            next_line = lines[i + 1] if i + 1 < len(lines) else ""
            # Walk past existing moderation_* lines until we find the
            # gap where moderation_user_message should go (or already is)
            j = i + 1
            saw_user_message = False
            while (
                j < len(lines)
                and lines[j].strip().startswith("moderation_")
            ):
                if lines[j].strip().startswith("moderation_user_message"):
                    saw_user_message = True
                    break
                j += 1
            if not saw_user_message:
                indent = lines[i][: len(lines[i]) - len(lines[i].lstrip())]
                # Insert right after this moderation_status line
                out.append(f"{indent}moderation_user_message: string | null;\n")
                added += 1
        i += 1
    if added > 0:
        TARGET.write_text("".join(out))
        print(f"  + added moderation_user_message after {added} moderation_status declaration(s)")
    else:
        print("  · all moderation_status declarations already paired with user_message")
    return 0


if __name__ == "__main__":
    sys.exit(main())
