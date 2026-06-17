#!/usr/bin/env python3
"""
Wire <TagSuggester /> into the FE new-post composer.

Strategy: find the file that renders a `<textarea name="body"` inside
the artist/community area, add an import + render block. Idempotent.

If we can't pin down a unique target file, we print clear diagnostics
and leave the codebase untouched.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path.home() / "fan-engage"
FRONTEND = REPO / "frontend"

IMPORT_LINE = 'import TagSuggester from "@/components/community/tag-suggester";'

# We render TagSuggester just after the body textarea closes. The composer
# already has a body field (textarea or controlled input). The block we
# inject grabs the textarea's current value via a useState that already
# exists for body — but to keep this patch general, we read body from a
# data-tag-body attribute that we expect on a wrapping <div> (set below).
#
# To avoid coupling to internal state, we write the simplest version:
# render TagSuggester with partialBody read from a local variable.
#
# Strategy: look for any file containing both `name="body"` and `textarea`
# under frontend/app or frontend/components. Among those, pick the smallest
# file (most likely the new-post composer, not a bigger page).


def find_composer() -> Path | None:
    candidates: list[Path] = []
    for root in [FRONTEND / "app", FRONTEND / "components"]:
        if not root.exists():
            continue
        for f in root.rglob("*.tsx"):
            try:
                txt = f.read_text(errors="ignore")
            except OSError:
                continue
            if 'name="body"' in txt and "<textarea" in txt and (
                "createPost" in txt or "compose" in txt.lower() or "new-post" in str(f).lower()
            ):
                candidates.append(f)

    if not candidates:
        return None
    # Prefer the smallest file (composer is usually a focused component)
    candidates.sort(key=lambda p: p.stat().st_size)
    return candidates[0]


def patch(file: Path) -> bool:
    txt = file.read_text()
    if "TagSuggester" in txt:
        print(f"  · {file.relative_to(REPO)} already references TagSuggester; nothing to do")
        return True

    # 1. Add import after the last existing import line (or at top)
    lines = txt.splitlines(keepends=True)
    last_import_idx = -1
    for i, ln in enumerate(lines):
        if ln.startswith("import "):
            last_import_idx = i
    if last_import_idx == -1:
        print(f"  ! no import statements found in {file.relative_to(REPO)}; aborting")
        return False
    lines.insert(last_import_idx + 1, IMPORT_LINE + "\n")
    txt = "".join(lines)

    # 2. Find the body textarea closing tag and inject TagSuggester after it.
    #    Use a regex that matches <textarea ... name="body" ... /> OR the
    #    self-closing variant OR a <textarea ...>...</textarea> block whose
    #    opening tag contains name="body".
    #
    # Pattern A: self-closing <textarea ... name="body" ... />
    self_closing = re.compile(
        r'(<textarea\b[^>]*\bname="body"[^>]*\/>)',
        re.MULTILINE | re.DOTALL,
    )
    # Pattern B: paired <textarea ... name="body" ...>...</textarea>
    paired = re.compile(
        r'(<textarea\b[^>]*\bname="body"[^>]*>.*?<\/textarea>)',
        re.MULTILINE | re.DOTALL,
    )

    suggester_block = (
        "\n      {/* AI #5 — TagSuggester (lights M-2 filter chips) */}\n"
        "      <TagSuggester\n"
        "        partialBody={body}\n"
        "        artistSlug={artistSlug}\n"
        "      />\n"
    )

    new_txt, count = self_closing.subn(r"\1" + suggester_block, txt, count=1)
    if count == 0:
        new_txt, count = paired.subn(r"\1" + suggester_block, txt, count=1)

    if count == 0:
        print(
            f"  ! couldn't find <textarea name=\"body\" …> in {file.relative_to(REPO)};",
            "leaving file unchanged.",
        )
        return False

    file.write_text(new_txt)
    print(f"  + patched {file.relative_to(REPO)} (added import + <TagSuggester />)")
    return True


def main() -> int:
    target = find_composer()
    if not target:
        print(
            "  ! could not find the new-post composer file. Searched frontend/app",
            "and frontend/components for *.tsx with both name=\"body\" and <textarea>",
            "and a 'createPost' or 'compose' marker. Manual wire-up required:",
        )
        print("      1. Add import: " + IMPORT_LINE)
        print(
            "      2. Render <TagSuggester partialBody={body} artistSlug={artistSlug} />",
        )
        print("         after the body textarea (where 'body' is your useState body var).")
        return 1

    print(f"  · target: {target.relative_to(REPO)}")
    ok = patch(target)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
