# AI moderation explainer (FE) — fan-facing reason chip

When the moderation model auto-hides a post, the fan sees a friendly
Claude-generated explanation in their feed instead of the post just
disappearing.

## Why a separate column?

`community_posts.moderation_reason` already exists but holds the
**model's classifier rationale** (third-person, analytical, e.g.
"Standard welcome announcement for fan community with on-topic
content"). That's useful for admins but reads weird if shown to the
fan whose post was hidden.

This bundle adds `moderation_user_message`: a 1-sentence,
warm-but-clear note written FOR the fan, e.g.
"Your post was hidden because it shares a phone number — try editing
it before resubmitting."

## Architecture

We do NOT modify the existing moderation pipeline (`lib/moderation/*`
or `createPostAction`). Instead:

1. **Backfill cron** at `/api/cron/moderation-explain` runs every
   15 min, finds posts where `moderation_status = 'auto_hide'` and
   `moderation_user_message IS NULL`, generates explanations, writes
   them back. Capped at 10/tick. Fan sees the chip within ~15 min of
   their post being hidden.
2. **Component**: `<ModerationChip />` renders when
   `post.moderation_status === 'auto_hide'` AND viewer is the post
   author. Visible only to author (RLS already restricts auto_hide
   rows from public — author exception assumed).

This means createPostAction stays untouched — no regression risk on
the most-patched file in the codebase.

## Files

- `migration_user_message.sql` — adds `moderation_user_message TEXT`
- `lib_explain.ts` → `frontend/lib/moderation/explain-user.ts`
- `cron_route.ts` → `frontend/app/api/cron/moderation-explain/route.ts`
- `patch_vercel_json.py` — adds cron entry
- `mod_chip.tsx` → `frontend/components/community/moderation-chip.tsx`
- `patch_types.py` — adds field to all CommunityPost-shaped types
  (using the all-occurrences pattern, lessons learned from alt-text)
- `patch_select.py` — adds field to all `community_posts.select(...)` calls
- `patch_post_card.py` — wires `<ModerationChip />` into post-card
- `apply.sh`

## Apply

1. Run `migration_user_message.sql` in FE Supabase
2. Then locally:

   ```bash
   cp -r "$HOME/Library/.../outputs/_ai_mod_explainer_bundle" "$HOME/fan-engage/"
   cd "$HOME/fan-engage"
   bash _ai_mod_explainer_bundle/apply.sh
   git push
   ```

## Smoke test

Currently 0 FE posts have `moderation_status = 'auto_hide'` (all 19
are `safe`). To verify the chip renders:

```sql
-- TEMPORARY: flag one post as auto_hide for testing
update community_posts
   set moderation_status = 'auto_hide'
 where id = (select id from community_posts where moderation_status = 'safe' limit 1);

-- Run the explainer cron from Vercel (Run button on /api/cron/moderation-explain)

-- Verify message was generated:
select moderation_user_message from community_posts where moderation_status = 'auto_hide';

-- Visit the community page logged in as the post's author. Chip should render.

-- REVERT:
update community_posts
   set moderation_status = 'safe', moderation_user_message = null
 where moderation_status = 'auto_hide';
```

## Cost

- Per explanation: ~$0.0001 (Haiku, ~150 tokens output)
- Steady state: 0 (no auto_hide posts → no cron work)
- Even at 10 hidden posts/day: $0.001/day = $0.36/year
