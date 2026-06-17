# Hero photo focal point — admin guide

## TL;DR

Every artist (Fan Engage) and brand (Brand Engage Pro) has a single hero photo
that gets reused at very different shapes — wide on the artist hero, tall on the
fan-home strip card, square on social/OG cards, etc. A photo cropped fine for one
shape (e.g. wide hero) can chop off heads or center on the wrong thing in another
(e.g. tall strip).

The new **Focal Point picker** on the admin edit page lets you click the spot in
the photo that should always stay visible. Every public surface that re-crops
the image now respects that spot. No code change, no SQL, no deploy.

---

## What it solves

Before this feature we had three hardcoded "focal-y" maps in the code (one per
surface) with per-slug overrides. Whenever a hero looked off, the only fix was a
code change + push + deploy. We hit this twice in the same week (Hunter Hawkins'
head was getting cropped on the artist page, RaeLynn's face was riding too low
on the fan home). Hardcoding doesn't scale once we have 20+ artists.

The picker turns it into a one-minute admin task instead.

---

## How to use it

1. Go to `/admin/artists/<slug>` (or `/admin/brands/<slug>` on Brand Engage Pro).
2. Scroll to the **Focal Point** card just under the Hero Image uploader.
3. **Click anywhere on the photo.** A small dot appears where you clicked. That
   dot is the guaranteed-visible point.
4. Watch the three preview tiles below update live:
   - **Strip · 3:4** — what the fan-home card will show
   - **Hero · 16:9** — what the public artist/brand page will show
   - **OG · 1:1** — what social shares and avatars will show
5. Drag the dot, or type exact `X %` / `Y %` values in the inputs, until all
   three previews look right.
6. Hit **Save changes** at the bottom of the form — the focal point saves with
   the rest of the artist/brand fields.

You can revisit any time and re-tune. Hitting **Reset to center** snaps it back
to 50/50 (the old default).

### Quick mental model
- `X %` is left-to-right (0 = far left, 100 = far right)
- `Y %` is top-to-bottom (0 = top, 100 = bottom)
- A face high in the frame → small Y (e.g. 25–35)
- A subject in the lower third → large Y (e.g. 70–85)

---

## Where it shows up

Setting the focal point on one place flows everywhere automatically:

| Surface                                  | Aspect       | Repo |
|------------------------------------------|--------------|------|
| `/artists/<slug>` hero                   | wide / 16:9  | FE   |
| Fan Home artist strip card               | tall / 3:4   | FE   |
| `/brands/<slug>` hero                    | wide / 16:9  | BEP  |
| Brand home strip card                    | tall / 3:4   | BEP  |
| OpenGraph / share cards (`/opengraph-image`) | square / 1:1 | both |

The three preview tiles in the admin picker mirror these exactly, so what you
see in the previews is what fans see.

---

## Examples we've already shipped

- **RaeLynn** — face was riding low on her fan-home strip. Focal point set to
  X=50, Y=28 → face stays centered in the strip card and on the artist hero.
- **Hunter Hawkins** — head was getting cropped on his artist hero. Focal point
  set to Y=90 → keeps his head in frame at every aspect ratio.
- **Nellie's Southern Kitchen** (BEP) — storefront photo composition needed the
  building's signage anchored at the bottom. Focal point set to Y=100.

---

## For Raymond / engineers

**Storage.** Two `smallint` columns on `artists` and `brands`:
`hero_focal_x` and `hero_focal_y`, both 0–100, both default 50, both `CHECK`-
constrained. Migrations: FE `0035_focal_point.sql`, BEP `0034_focal_point.sql`
(both already applied to prod).

**Render.** A single helper at `frontend/lib/images/focal-point.ts` exports
`focalPointStyle({ heroFocalX, heroFocalY })` which returns the correct
`{ objectPosition: "<x>% <y>%" }` style. Every render surface uses
`<img className="object-cover" style={focalPointStyle(artist)} />`.

**Picker UI.** `frontend/components/focal-point-picker.tsx` — pure client
component, ~150 lines. Click/drag handlers compute the click position relative
to the rendered image bounds, clamp to 0–100, call back to the parent form.
Three `<PreviewTile>` siblings render the same image at the three target
aspect ratios using the same helper.

**Form wiring.** `edit-form.tsx` keeps `focalX` / `focalY` in `useState`, sets
them into `FormData` as `hero_focal_x` / `hero_focal_y` on submit, and the
existing server action (`updateArtistAction` / `updateBrandAction`) clamps and
writes the values to the row.

If we ever want to add a focal point to a *non-hero* image (e.g. a campaign
banner or a marketplace tile), the helper and picker component are reusable —
just add the two columns to that table and mount the picker.

---

## Future / nice-to-haves

- **Focal-point on community post images** — currently community photos use a
  generic center crop. Same pattern would apply.
- **Auto-detect with vision model** — for new uploads we could call a face/
  saliency detector to pre-fill a sensible default. Would still let admins
  override.
- **Per-surface override** — currently a single (x, y) drives every surface. If
  we ever need different focal points per aspect (rare), the schema can extend
  to per-surface JSON without breaking anything that reads the existing columns.
