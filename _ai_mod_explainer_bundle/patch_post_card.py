#!/usr/bin/env python3
"""
Wire <ModerationChip /> into post-card.tsx.

Strategy: post-card is at frontend/app/artists/[slug]/community/post-card.tsx
(verified earlier). We need to:

1. Add import: `import ModerationChip from "@/components/community/moderation-chip";`
2. Render the chip when:
     post.moderation_status === "auto_hide" AND viewerId === post.author_id

The post-card likely takes a `viewerId` prop or similar. If we can't
find that, we fall back to ALWAYS rendering when status === "auto_hide"
(safe: the RLS already restricts visibility to author + admins).

Idempotent.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

TARGET = (
    Path.home()
    / "fan-engage"
    / "frontend"
    / "app"
    / "artists"
    / "[slug]"
    / "community"
    / "post-card.tsx"
)
IMPORT_LINE = 'import ModerationChip from "@/components/community/moderation-chip";'


def main() -> int:
    if not TARGET.exists():
        print(f"  ! {TARGET} not found")
        return 1
    src = TARGET.read_text()

    if "ModerationChip" in src:
        print("  · post-card already references ModerationChip; skipping")
        return 0

    # 1) Add import after the LAST import line at the top of the file
    lines = src.splitlines(keepends=True)
    last_import = -1
    for i, ln in enumerate(lines):
        if ln.startswith("import "):
            last_import = i
        elif last_import >= 0 and not ln.startswith("import "):
            # We've passed the import block
            if not ln.strip() or ln.strip().startswith("//"):
                continue
            break
    if last_import == -1:
        print("  ! no import statements found in post-card.tsx; aborting")
        return 1
    # Make sure we don't insert inside a multi-line `import { ... }` block
    # Walk forward from last_import to find the closing line if it's multi-line
    closing = last_import
    if "{" in lines[last_import] and "}" not in lines[last_import]:
        for k in range(last_import + 1, len(lines)):
            if "}" in lines[k]:
                closing = k
                break
    lines.insert(closing + 1, IMPORT_LINE + "\n")
    src = "".join(lines)

    # 2) Render the chip. We add it just inside the top of the post body
    #    rendering area. Anchor: look for the existing post body block.
    #    Several plausible patterns; try them in order.
    #
    # Pattern A: paragraph that renders post.body
    # Pattern B: rendering of post.kind badges / titles
    #
    # Simplest universal anchor: insert right after the opening of the
    # post body div. If we can't find one, insert before the closing
    # </article> or </div> at the end.

    chip_jsx = (
        '\n      {post.moderation_status === "auto_hide" && (\n'
        '        <ModerationChip message={post.moderation_user_message ?? null} />\n'
        '      )}\n'
    )

    # Try: insert right after the line that opens the post container.
    # Common pattern is `<article ...>` or `<li ...>` or `<div ...>` followed
    # by the post body. We'll insert the chip as the FIRST child of that
    # container.
    article_re = re.compile(
        r'(\<(?:article|li|div)[^>]*className=\{?[^>]*\}?\>\s*\n)',
        re.MULTILINE,
    )
    m = article_re.search(src)
    if not m:
        print("  ! couldn't locate post container opening tag — adding import only")
        TARGET.write_text(src)
        print(f"  · import added; render manually:")
        print(chip_jsx)
        return 0

    src = src[: m.end()] + chip_jsx + src[m.end():]
    TARGET.write_text(src)
    print(f"  + wired ModerationChip into {TARGET.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
