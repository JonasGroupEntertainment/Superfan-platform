# AI alt-text for uploaded images (FE)

Auto-generate accessibility alt text via Claude Haiku 4.5 vision
when a fan uploads an image. Stores in new `community_posts.image_alt`
column. Editable by the fan before submit. Rendered in the post-card
img tag for screen readers + SEO.

## Why

Right now community posts with images use a generic `alt=""` (or
hardcoded fallback). Screen readers see nothing. This:

- Auto-fills alt text on upload (zero cognitive load for fans)
- Lets fans edit it inline if AI misreads
- Renders correctly for assistive tech
- Improves SEO (Google indexes alt text)

## Logic

1. Fan uploads image via existing `<ImageUploader />`
2. `onUploaded(url)` callback fires → `<AltTextSuggester />` mounts
3. Component auto-POSTs to `/api/ai/alt-text { imageUrl, artistSlug }`
4. Route fetches image, base64-encodes, sends to Claude Haiku vision
5. Claude returns one-line description ≤125 chars
6. Component renders editable input, fan can refine
7. Hidden `image_alt` form field carries the value through submit
8. `createPostAction` reads `image_alt` and inserts into the row

## Files

- `migration_alt_text.sql` — adds `community_posts.image_alt TEXT`
- `lib_alt.ts` → `frontend/lib/alt-text/generate.ts`
- `api_route.ts` → `frontend/app/api/ai/alt-text/route.ts`
- `alt_text_suggester.tsx` → `frontend/components/community/alt-text-suggester.tsx`
- `hotfix.sh` — installs files, patches composer + actions, attempts
  post-card alt-attribute patch (best-effort)

## Apply

1. Run `migration_alt_text.sql` in FE Supabase SQL editor
2. Then locally:

   ```bash
   cp -r "$HOME/Library/.../outputs/_ai_alt_text_bundle" "$HOME/fan-engage/"
   cd "$HOME/fan-engage"
   bash _ai_alt_text_bundle/hotfix.sh
   git push
   ```

## Smoke test

1. Visit https://fan-engage-pearl.vercel.app/artists/raelynn/community
2. Open composer
3. Upload a photo (drag in or pick from device)
4. Watch the alt text input populate within 3-5s
5. Edit if needed, submit
6. Inspect the rendered post via dev tools — `<img alt="…" />` should
   contain the AI-generated text

## Cost

~$0.0005 per image (vision is more expensive than text). At
moderate volume (~50 images/day), that's ~$0.025/day = ~$9/year.

## Phase 2 (deferred)

- Backfill cron to generate alt text for posts that already have
  images but no `image_alt` (existing photos posted before this
  feature shipped). Reuses lib/alt-text/generate.ts.
