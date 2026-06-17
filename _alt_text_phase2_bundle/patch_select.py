#!/usr/bin/env python3
"""
Add `image_alt` to community_posts SELECT strings in data fetchers.

Searches frontend/lib/data/ and frontend/app/ for files calling
.from("community_posts").select("...image_url...") and adds image_alt
to the column list.

Idempotent.
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path.home() / "fan-engage" / "frontend"


def patch_file(file: Path) -> int:
    """Returns count of selects modified in this file."""
    try:
        txt = file.read_text(errors="ignore")
    except OSError:
        return 0

    if "community_posts" not in txt or "image_url" not in txt:
        return 0

    # Find select strings that mention image_url and don't already mention image_alt.
    # We match select("...") OR select(`...`) calls broadly.
    # Be conservative: only modify when image_url appears and image_alt doesn't.
    def repl(m: re.Match) -> str:
        opener = m.group(1)  # select( and the string literal opener
        body = m.group(2)
        closer = m.group(3)
        if "image_alt" in body:
            return m.group(0)
        if "image_url" not in body:
            return m.group(0)
        # Insert image_alt right after image_url
        new_body = re.sub(
            r"\bimage_url\b",
            "image_url, image_alt",
            body,
            count=1,
        )
        return opener + new_body + closer

    pattern = re.compile(
        r'(\.select\(\s*[\"\'`])([^\"\'`]*?)([\"\'`]\s*\))',
        re.DOTALL,
    )
    new_txt, count = pattern.subn(repl, txt)
    if count == 0:
        return 0

    # Only count selects that actually changed (had image_url, no image_alt).
    # Easier: just check if anything is different.
    if new_txt == txt:
        return 0
    file.write_text(new_txt)
    return 1


def main() -> int:
    targets: list[Path] = []
    for root in [ROOT / "lib" / "data", ROOT / "app"]:
        if root.exists():
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
        if patch_file(f) > 0:
            print(f"  + added image_alt to select in {f.relative_to(Path.home())}")
            total += 1

    if total == 0:
        print("  ! no select() with image_url found; manual edit may be needed")
        return 1
    print(f"  · patched {total} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
