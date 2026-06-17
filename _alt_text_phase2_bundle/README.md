# Alt-text Phase 2 (FE) — render side + backfill cron

Phase 1 (`_ai_alt_text_bundle/`, commit `ab7a794`) ships the suggester
+ writes to `community_posts.image_alt`. Phase 2 makes the data
actually useful:

1. **Wire the column through** — type definition, data fetcher select,
   and post-card `<img alt={post.image_alt ?? ""}>` so screen readers
   actually read it
2. **Backfill cron** — generates alt text for the 8 existing FE image
   posts that were created before Phase 1 (and any future posts where
   the inline AI call failed)

## Files

- `cron_route.ts` → `frontend/app/api/cron/alt-text-backfill/route.ts`
- `patch_vercel_json.py` — adds `*/15 * * * *` cron entry
- `patch_types.py` — adds `image_alt: string | null` to CommunityPost type
- `patch_select.py` — adds `image_alt` to the community_posts select string
- `patch_render.py` — best-effort: updates `<img>` / `<Image>` alt prop
  in post-card (and any other file that renders post.image_url)
- `apply.sh` — runs all patches, type-checks, commits

## Apply

```bash
bash _alt_text_phase2_bundle/apply.sh
git push
```

After deploy, manually trigger the cron once to backfill the 8 existing
posts:

- https://vercel.com/jonas-group/fan-engage/settings/cron-jobs
  → click "Run" on `/api/cron/alt-text-backfill`

## Cost

Backfill cron is bounded:
- ~$0.0005 per image × 10 per tick × 4 ticks/hour = $0.02/hour MAX
- In steady state (no posts needing backfill), zero cost
- One-time backfill of the 8 existing posts: ~$0.004 total

## Smoke test

1. Manually trigger the cron via Vercel
2. Check `select count(*) from community_posts where image_url is not null and image_alt is null;` should return 0
3. Pick a post with an image, inspect its `<img alt="…">` in browser
   dev tools — should now show the AI-generated description
