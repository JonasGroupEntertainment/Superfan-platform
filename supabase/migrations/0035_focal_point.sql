-- Migration 0035: add hero_focal_x / hero_focal_y to artists.
--
-- Stored as smallint 0..100 (percentage from left/top of the source image).
-- Default 50/50 = centered. Values used by frontend's focalPointStyle()
-- helper to render `object-position: ${x}% ${y}%`.
--
-- Backfill preserves today's hardcoded per-slug overrides so visual
-- rendering is identical at deploy time:
--   raelynn        → focal_y 30  (was HERO_FOCAL_Y_BY_SLUG.raelynn = 30)
--   hunter-hawkins → focal_y 90  (was HERO_FOCAL_Y_BY_SLUG."hunter-hawkins" = 90)
-- Strip-card override for raelynn was 25; using the artist-hero value (30)
-- as the single source of truth. Tiny visual delta on the strip card,
-- acceptable for Phase 1 — admins can re-tune via SQL once Phase 2 ships
-- the in-app picker.

alter table artists
  add column if not exists hero_focal_x smallint not null default 50
    check (hero_focal_x between 0 and 100),
  add column if not exists hero_focal_y smallint not null default 50
    check (hero_focal_y between 0 and 100);

-- Backfill from current hardcoded overrides.
update artists set hero_focal_y = 30 where slug = 'raelynn'        and hero_focal_y = 50;
update artists set hero_focal_y = 90 where slug = 'hunter-hawkins' and hero_focal_y = 50;

-- Verification query — should show non-default values for the two
-- artists above and 50/50 for everyone else.
-- select slug, name, hero_focal_x, hero_focal_y, active from artists order by sort_order;
