#!/usr/bin/env python3
"""
Add `moderation_user_message` to community_posts SELECT strings
that already mention `moderation_status` and don't yet have
moderation_user_message.
Idempotent.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path.home() / "fan-engage" / "frontend"


def patch_file(file: Path) -> bool:
    try:
        txt = file.read_text(errors="ignore")
    except OSError:
        return False
    if "community_posts" not in txt or "moderation_status" not in txt:
        return False

    def repl(m: re.Match) -> str:
        opener = m.group(1)
        body = m.group(2)
        closer = m.group(3)
        if "moderation_user_message" in body:
            return m.group(0)
        if "moderation_status" not in body:
            return m.group(0)
        new_body = re.sub(
            r"\bmoderation_status\b",
            "moderation_status, moderation_user_message",
            body,
            count=1,
        )
        return opener + new_body + closer

    pattern = re.compile(
        r'(\.select\(\s*[\"\'`])([^\"\'`]*?)([\"\'`]\s*\))',
        re.DOTALL,
    )
    new_txt = pattern.sub(repl, txt)
    if new_txt == txt:
        return False
    file.write_text(new_txt)
    return True


def main() -> int:
    targets: list[Path] = []
    for root in [ROOT / "lib" / "data", ROOT / "app"]:
        if not root.exists():
            continue
        for f in root.rglob("*.ts"):
            if "node_modules" in f.parts or ".next" in f.parts:
                continue
            targets.append(f)
        for f in root.rglob("*.tsx"):
            if "node_modules" in f.parts or ".next" in f.parts:
                continue
            targets.append(f)

    total = 0
    for f in targets:
        if patch_file(f):
            print(f"  + added moderation_user_message to select in {f.relative_to(Path.home())}")
            total += 1
    if total == 0:
        print("  · no select() with moderation_status found, OR already wired")
    else:
        print(f"  · patched {total} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
