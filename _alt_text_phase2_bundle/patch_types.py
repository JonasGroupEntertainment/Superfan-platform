#!/usr/bin/env python3
"""
Add `image_alt: string | null` to the CommunityPost type definition.
Searches frontend/lib/data/ for files containing CommunityPost and an
existing `image_url` field. Adds the new field after `image_url`.

Idempotent.
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path.home() / "fan-engage" / "frontend"


def find_types_file() -> Path | None:
    candidates: list[Path] = []
    for f in ROOT.rglob("*.ts"):
        # Skip node_modules and .next
        if "node_modules" in f.parts or ".next" in f.parts:
            continue
        try:
            txt = f.read_text(errors="ignore")
        except OSError:
            continue
        if "CommunityPost" in txt and "image_url" in txt and (
            "interface CommunityPost" in txt or "type CommunityPost" in txt
        ):
            candidates.append(f)
    if not candidates:
        return None
    # Prefer files in lib/data
    candidates.sort(key=lambda p: ("data" not in str(p), p))
    return candidates[0]


def patch(file: Path) -> bool:
    txt = file.read_text()
    if "image_alt" in txt:
        print(f"  · {file.relative_to(Path.home())} already has image_alt; skipping")
        return True

    # Find a line declaring image_url inside CommunityPost type/interface
    # and insert image_alt after it. Cover common shapes:
    #   image_url: string | null;
    #   image_url?: string | null;
    #   image_url: string;
    pattern = re.compile(
        r"^(\s+)image_url(\??):\s*string\s*(?:\|\s*null)?;?\s*$",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(txt))
    if not matches:
        print(f"  ! couldn't find image_url field in {file.relative_to(Path.home())}")
        return False

    # Insert image_alt line after the FIRST occurrence (we want the
    # CommunityPost canonical type; if there are multiple, others are
    # likely subtypes that derive from this one).
    m = matches[0]
    indent = m.group(1)
    insertion = f"\n{indent}image_alt: string | null;"
    end = m.end()
    new_txt = txt[:end] + insertion + txt[end:]
    file.write_text(new_txt)
    print(f"  + added image_alt to {file.relative_to(Path.home())}")
    return True


def main() -> int:
    target = find_types_file()
    if not target:
        print("  ! couldn't find CommunityPost type definition; manual edit needed:")
        print("      add `image_alt: string | null;` to the CommunityPost interface")
        return 1
    return 0 if patch(target) else 1


if __name__ == "__main__":
    sys.exit(main())
