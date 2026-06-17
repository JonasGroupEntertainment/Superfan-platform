# AI #7 Personalized feed v1 — "Picked for You" tile (FE)

A small server-rendered tile that surfaces 3 personalized community
posts to a fan, based on their `interest` text and what's recent in
the community. Goes at the top of the artist community page above the
chronological feed.

## Design rationale

The recs doc deferred this to v3 "gated on volume". Now that we have:
- 19 posts
- M-2 tags column populated by AI #5 TagSuggester + auto-tag cron
- fans.interest captured via AI #9 onboarding chat
- Phase 1 embeddings infrastructure (we don't use it in v1)

…there's enough signal to ship a useful v1.

**v1 scoring** (intentionally simple; no embeddings call to save cost):
- Tokenize fan's `interest` text → list of lowercase keywords
- For each candidate post: `score = tag_match_count * 2 + recency_score`
- `recency_score` = linear decay from 1.0 (today) to 0.0 (60 days old)
- Filter: not own posts, not commented on by the fan, safe + public,
  within last 60 days
- Return top 3 by score

If fan has no interest set OR no posts match, fall back to most-recent
3 safe public posts the fan hasn't engaged with. So the tile always
shows something for an active fan.

**Future v2** can layer on embedding similarity + reactions weight +
cross-artist Fan Home aggregation.

## Files

- `lib_compute.ts` → `frontend/lib/personal-feed/compute.ts` — exports
  `getPickedForYou({ fanId, artistSlug, limit })`
- `picked_for_you.tsx` → `frontend/components/personal/picked-for-you.tsx`
  — server component that fetches and renders the tile
- `patch_community_page.py` — wires `<PickedForYou />` into
  `app/artists/[slug]/community/page.tsx` above the feed
- `apply.sh`

## Apply

```bash
bash _ai7_personalized_feed_bundle/apply.sh
git push
```

## Smoke test

1. Visit https://fan-engage-pearl.vercel.app/artists/raelynn/community
   while signed in
2. Above the feed, see "Picked for you" tile with 3 cards
3. Click a card → navigate to that post (or scroll to it inline)

## Cost

Zero. No external API calls — pure SQL + scoring in TypeScript.
