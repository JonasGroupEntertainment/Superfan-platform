# AI-suggested tags on new post composer (FE)

Sister to `<CaptionSuggester />`. Fan types post body → clicks
"✨ Suggest tags" → Claude Haiku returns 1-3 short tags →
fan toggles chips on/off → tags ride along with form submit
and merge into `community_posts.tags` (existing M-2 column).

## Why a fan-facing suggester when auto-tagging cron exists?

The auto-tagging cron (`/api/cron/tags-backfill` from FE Phase 5)
runs every 15 min and tags posts after they're submitted. That's
fine but invisible to fans. A fan-facing suggester:

  - Lets fans curate (accept good tags, reject bad ones)
  - Lights up the M-2 filter chips immediately on submit instead
    of waiting 0–15 minutes for the cron tick
  - Gives fans a sense of agency — they're shaping the taxonomy

The suggester ADDS tags to whatever the cron later assigns (we
union them in createPostAction so nothing is lost).

## Logic

1. Fan types body in composer (must be ≥ 12 chars)
2. Fan clicks "✨ Suggest tags"
3. Client calls `POST /api/ai/suggest-tags { partialBody, artistSlug }`
4. Route auths the user, calls Claude Haiku, returns 1-3 tags
5. Fan toggles chips → selected set is held in component state and
   serialized into a hidden `ai_suggested_tags` input
6. On submit, `createPostAction` reads `ai_suggested_tags`, splits on
   comma, unions with whatever auto-tagger produces (deduped, capped
   at 6 total)

## Files

- `lib_suggest.ts` → `frontend/lib/tagging/suggest.ts`
- `api_route.ts` → `frontend/app/api/ai/suggest-tags/route.ts`
- `tag_suggester.tsx` → `frontend/components/community/tag-suggester.tsx`
- `patch_actions.py` — wires `ai_suggested_tags` into createPostAction
- `patch_composer.py` — renders `<TagSuggester />` in the new-post form

## Apply

```bash
bash _ai_tags_suggest_bundle/apply.sh
```

## Smoke test

1. Visit https://fan-engage-pearl.vercel.app/artists/raelynn/community
2. Click "Compose"
3. Type a post body about, say, a tour date
4. Click "✨ Suggest tags"
5. Tags appear as chips. Click 1-2 to select.
6. Submit post.
7. Check on the community page — your post should have those tags
   render as chips beneath the body, AND the M-2 filter chips at the
   top should now include those tags if they're new.

## Cost

~$0.0001 per suggestion call. Bounded by post composition events.
Maybe $0.05/day at heavy load.
