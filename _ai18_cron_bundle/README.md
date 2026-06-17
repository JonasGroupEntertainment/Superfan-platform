# AI #18 — Cron auto-generation for artist post drafts (FE)

Daily cron that surveys active artists, finds quiet communities, and
auto-generates a draft for each. Admin opens `/admin/post-drafts` in
the morning and finds suggestions ready to review.

## Logic

For each artist with `is_active = true`:
1. Skip if a pending draft already exists for this artist (don't pile up)
2. Skip if community has 3+ posts in the last 5 days (not quiet)
3. Otherwise: gather context (upcoming events + recent admin posts +
   fan comments) → Claude → save draft

Cap at 20 artists per cron tick to bound cost.

## Files

- `cron_route.ts` → `frontend/app/api/cron/post-drafts/route.ts`
- `patch_vercel_json.py` — adds `0 13 * * *` cron entry

## Apply

```bash
bash _ai18_cron_bundle/apply.sh
```

## Smoke test (after deploy)

Manually trigger via:
```
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://fan-engage-pearl.vercel.app/api/cron/post-drafts
```

Returns `{ ok, scanned, generated, skipped, errors }`. Visit
`/admin/post-drafts` to see queued drafts.

## Cost

~$0.0001 per draft × ~20 artists max/day = $0.002/day = under $1/year.
