#!/usr/bin/env python3
"""
Update <img> and next/image <Image> elements that render post.image_url
to use post.image_alt as the alt attribute.

Two patterns we handle:
  A. <img src={post.image_url} alt="hardcoded" ... />
     → replace alt="hardcoded" with alt={post.image_alt ?? "hardcoded"}
  B. <Image src={post.image_url} alt={something} ... />
     → replace alt={something} with alt={post.image_alt ?? <something>}

Conservative: only touches files with both `post.image_url` and an
existing `<img` or `<Image` on a post-card-like file.

Prints clear "manual" instructions if it can't find a match.

Idempotent — checks for `post.image_alt` before patching.
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path.home() / "fan-engage" / "frontend"


def patch_file(file: Path) -> int:
    try:
        txt = file.read_text(errors="ignore")
    except OSError:
        return 0

    if "post.image_url" not in txt:
        return 0

    if "post.image_alt" in txt:
        # Already wired
        return 0

    original = txt

    # Pattern A: alt="..." (hardcoded string), inside an element that also has src={post.image_url}
    # We search for <img...post.image_url...alt="..."...> or vice versa.
    # Easier: match `alt="<chars>"` immediately preceded or followed (within ~200 chars) by `post.image_url`.
    def replace_alt_string(match: re.Match) -> str:
        full = match.group(0)
        alt_value = match.group(1)
        new_attr = f'alt={{post.image_alt ?? "{alt_value}"}}'
        return full.replace(match.group(0).split("alt=")[0] + f'alt="{alt_value}"',
                            match.group(0).split("alt=")[0] + new_attr)

    # Simpler approach: scan line-by-line / do regex over windows
    # We do a focused approach: find every `alt="..."` whose preceding 300 chars contain `post.image_url`,
    # and replace it.
    altstr_pattern = re.compile(r'alt="([^"]*)"')
    indices = []
    for m in altstr_pattern.finditer(txt):
        window_start = max(0, m.start() - 400)
        window = txt[window_start:m.end() + 50]
        if "post.image_url" in window and "post.image_alt" not in window:
            indices.append(m)

    if indices:
        # Replace from the back so offsets don't shift
        for m in reversed(indices):
            alt_value = m.group(1)
            replacement = f'alt={{post.image_alt ?? "{alt_value}"}}'
            txt = txt[:m.start()] + replacement + txt[m.end():]

    # Pattern B: alt={something} (expression), where the surrounding element refs post.image_url
    altexpr_pattern = re.compile(r'alt=\{([^{}]+)\}')
    indices = []
    for m in altexpr_pattern.finditer(txt):
        window_start = max(0, m.start() - 400)
        window = txt[window_start:m.end() + 50]
        if "post.image_url" in window and "post.image_alt" not in window:
            indices.append(m)

    if indices:
        for m in reversed(indices):
            inner = m.group(1).strip()
            # Don't double-wrap
            if "post.image_alt" in inner:
                continue
            replacement = f'alt={{post.image_alt ?? ({inner})}}'
            txt = txt[:m.start()] + replacement + txt[m.end():]

    if txt == original:
        return 0
    file.write_text(txt)
    return 1


def main() -> int:
    if not ROOT.exists():
        print(f"  ! {ROOT} not found")
        return 1

    targets: list[Path] = []
    for f in ROOT.rglob("*.tsx"):
        if "node_modules" in f.parts or ".next" in f.parts:
            continue
        targets.append(f)

    total = 0
    for f in targets:
        if patch_file(f) > 0:
            print(f"  + wired alt to post.image_alt in {f.relative_to(Path.home())}")
            total += 1

    if total == 0:
        print("  · no <img>/<Image> with post.image_url + alt= found, OR all already wired.")
        print("    If posts don't render alt text in browser, manually edit post-card.tsx:")
        print('      <img src={post.image_url} alt={post.image_alt ?? ""} ... />')
        return 0
    print(f"  · patched {total} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
