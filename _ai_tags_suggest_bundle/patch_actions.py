#!/usr/bin/env python3
"""
Wire `ai_suggested_tags` formData → community_posts.tags merge into
the FE createPostAction.

Strategy:
  1. Find the file with `export async function createPostAction`
  2. After the FormData parse area (we anchor on `formData.get("body")`),
     insert a const that captures user-selected tags.
  3. Right before `.from("community_posts").insert(`, insert a tag union
     block that merges user tags with whatever `tags` variable is in
     scope (or initializes it).

If anchors don't match cleanly, print a manual snippet for Kevin.
Idempotent.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path.home() / "fan-engage"
FRONTEND = REPO / "frontend"

CAPTURE_BLOCK = """
  // AI #5 — capture fan-selected tags from TagSuggester
  const aiSuggestedTagsRaw = String(formData.get("ai_suggested_tags") ?? "");
  const aiSuggestedTags = aiSuggestedTagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 24);
"""

# We attach this comment so we can detect prior runs
IDEMPOTENCY_MARKER = "AI #5 — capture fan-selected tags from TagSuggester"


def find_actions_file() -> Path | None:
    if not FRONTEND.exists():
        return None
    candidates: list[Path] = []
    for f in FRONTEND.rglob("actions.ts"):
        try:
            txt = f.read_text(errors="ignore")
        except OSError:
            continue
        if "createPostAction" in txt and "community_posts" in txt:
            candidates.append(f)
    if not candidates:
        return None
    # Prefer files under app/artists or app/community
    candidates.sort(key=lambda p: ("artists" not in str(p), "community" not in str(p), p))
    return candidates[0]


def patch(file: Path) -> bool:
    txt = file.read_text()
    if IDEMPOTENCY_MARKER in txt:
        print(f"  · {file.relative_to(REPO)} already patched; nothing to do")
        return True

    # 1. Insert capture block after the first `formData.get("body")` line
    #    (within createPostAction). We just place it right after that line.
    body_re = re.compile(r'(formData\.get\("body"\)[^\n]*\n)')
    m = body_re.search(txt)
    if not m:
        print(
            f"  ! couldn't find `formData.get(\"body\")` in {file.relative_to(REPO)}"
        )
        print_manual()
        return False

    insert_at = m.end()
    new_txt = txt[:insert_at] + CAPTURE_BLOCK + txt[insert_at:]

    # 2. Inject merge into the .insert({ … tags: ... }) area. We try two
    #    shapes: existing `tags` key (replace its value) or no `tags` key
    #    (add one before the closing brace of the insert object).
    #
    # First: detect a `tags:` key inside the insert payload close to
    # `community_posts`. We do a safe text replacement of the FIRST
    # occurrence of `tags: ` after `from("community_posts").insert(`.
    insert_call_re = re.compile(
        r'\.from\("community_posts"\)\s*\.insert\(\s*\{(.*?)\}\s*\)',
        re.DOTALL,
    )
    cm = insert_call_re.search(new_txt)
    if not cm:
        # Maybe it's createOrUpdate or a multi-line variant; bail with
        # manual instructions.
        file.write_text(new_txt)  # capture block stays — useful even alone
        print(
            f"  · added capture block to {file.relative_to(REPO)} but couldn't find",
            "an insert call to merge into. See manual snippet:",
        )
        print_manual()
        return True

    payload = cm.group(1)
    if "tags:" in payload or "tags :" in payload:
        # Replace the existing tags value with a union of the existing
        # expression and aiSuggestedTags.
        # We look for `tags: <expr>` and rewrite to `tags: [...new Set([...(<expr> ?? []), ...aiSuggestedTags])].slice(0, 6)`
        tags_re = re.compile(r"(tags\s*:\s*)([^,}\n]+)")
        new_payload, count = tags_re.subn(
            lambda m: m.group(1)
            + f"[...new Set([...((({m.group(2).strip()}) ?? []) as string[]), ...aiSuggestedTags])].slice(0, 6)",
            payload,
            count=1,
        )
        if count == 0:
            file.write_text(new_txt)
            print(
                f"  · added capture block to {file.relative_to(REPO)} but tags",
                "regex didn't match; manual merge needed:",
            )
            print_manual()
            return True
    else:
        # No tags key present — add one
        new_payload = payload.rstrip()
        if new_payload.endswith(","):
            sep = " "
        elif new_payload.endswith("{"):
            sep = ""
        else:
            sep = ", "
        new_payload = (
            new_payload
            + sep
            + "tags: aiSuggestedTags.length > 0 ? aiSuggestedTags.slice(0, 6) : null"
        )

    new_txt = new_txt[: cm.start()] + ".from(\"community_posts\").insert({" + new_payload + "})" + new_txt[cm.end():]

    file.write_text(new_txt)
    print(f"  + patched {file.relative_to(REPO)} (capture + tags merge)")
    return True


def print_manual() -> None:
    print(
        """
  MANUAL WIRE-UP — paste at top of createPostAction, after FormData parsing:

    const aiSuggestedTagsRaw = String(formData.get("ai_suggested_tags") ?? "");
    const aiSuggestedTags = aiSuggestedTagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 24);

  Then in the community_posts.insert payload, set tags to:

    tags: aiSuggestedTags.length > 0 ? aiSuggestedTags.slice(0, 6) : null,

  (or merge with whatever auto-tag logic produces.)
"""
    )


def main() -> int:
    target = find_actions_file()
    if not target:
        print("  ! couldn't find createPostAction file under frontend/. Manual wire-up:")
        print_manual()
        return 1
    print(f"  · target: {target.relative_to(REPO)}")
    ok = patch(target)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
