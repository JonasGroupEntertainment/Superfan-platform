#!/usr/bin/env python3
"""
Wire <PickedForYou /> into the artist community page.

We expect frontend/app/artists/[slug]/community/page.tsx to be a
server component that fetches the current fan via getCurrentFan() (or
similar) and the artist slug via params. We add the import and render
<PickedForYou /> just above the existing post list.

Defensive: if we can't find a clear anchor we add the import only and
print a manual snippet.

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
    / "page.tsx"
)
IMPORT_LINE = 'import PickedForYou from "@/components/personal/picked-for-you";'


def main() -> int:
    if not TARGET.exists():
        print(f"  ! {TARGET} not found")
        return 1
    src = TARGET.read_text()

    if "PickedForYou" in src:
        print("  · PickedForYou already wired; nothing to do")
        return 0

    # 1) Add import after last import line (handle multi-line imports)
    lines = src.splitlines(keepends=True)
    last_import = -1
    for i, ln in enumerate(lines):
        if ln.startswith("import "):
            last_import = i
    if last_import == -1:
        print("  ! no imports found in community page")
        return 1
    closing = last_import
    if "{" in lines[last_import] and "}" not in lines[last_import]:
        for k in range(last_import + 1, len(lines)):
            if "}" in lines[k]:
                closing = k
                break
    lines.insert(closing + 1, IMPORT_LINE + "\n")
    src = "".join(lines)

    # 2) Render <PickedForYou /> — anchor on whatever returns the post list.
    #    Strategy: insert it as the first child after the opening <main>
    #    or root container of the JSX. We need access to `fan.id` and
    #    `params.slug` (or whatever variable holds the artist slug).
    #    Make it conditional on having a logged-in fan.

    # Look for `params.slug` as the artistSlug source — common Next.js param
    # accessor. If `slug` is destructured from params elsewhere (e.g.
    # `const { slug } = await params;`), that name should also work.
    has_params_slug = "params.slug" in src or re.search(r"const\s*\{\s*slug\s*\}\s*=", src)
    has_fan_id = re.search(r"\bfan\??\.\s*id\b", src) or "fan.id" in src

    if not (has_params_slug and has_fan_id):
        TARGET.write_text(src)
        print("  · import added; couldn't auto-detect fan/slug variables — manual render needed:")
        print(
            """      {fan && (
        <PickedForYou fanId={fan.id} artistSlug={slug} />
      )}"""
        )
        return 0

    # Try to insert right after the opening <main>...> tag.
    main_re = re.compile(r"(<main\b[^>]*>\s*\n)", re.MULTILINE)
    m = main_re.search(src)
    if not m:
        # Fallback: after first opening container with className
        main_re = re.compile(r'(<(?:section|div)\b[^>]*className=[^>]*>\s*\n)', re.MULTILINE)
        m = main_re.search(src)
    if not m:
        TARGET.write_text(src)
        print("  · import added but no container anchor found; manual render needed")
        return 0

    # Determine the slug variable name
    slug_var = "slug" if re.search(r"const\s*\{\s*slug\s*\}\s*=", src) else "params.slug"

    block = (
        '\n      {fan?.id && (\n'
        f'        <PickedForYou fanId={{fan.id}} artistSlug={{{slug_var}}} />\n'
        '      )}\n'
    )
    src = src[:m.end()] + block + src[m.end():]
    TARGET.write_text(src)
    print(f"  + wired <PickedForYou /> into {TARGET.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
