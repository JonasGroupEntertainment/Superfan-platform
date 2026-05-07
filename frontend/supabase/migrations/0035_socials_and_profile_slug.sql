-- 0035_socials_and_profile_slug.sql
-- Architectural correction (mirrors BEP 0033): previously `fans.handle`
-- was overloaded as both (a) the TikTok/Instagram handle written by
-- the onboarding wizard's "TikTok or Instagram handle" field, AND
-- (b) the URL slug added by migration 0034 for /fans/<handle>. Two
-- concerns, one column — collision.
--
-- This migration splits them:
--   - fans.socials       (jsonb) — social-handle storage. Matches the
--     artist pattern (artists.social is jsonb).
--   - fans.profile_slug  (text)  — URL-safe profile slug used by
--     /fans/<slug> and the unique index.
--
-- The legacy `handle` column stays for one release as a deprecated
-- field. Values that look like social handles are moved to
-- socials.instagram_or_tiktok and the source nulled, so reads are
-- unambiguous. Drop `handle` once the frontend stops referencing it.

-- ─── 1. Add socials JSONB ──────────────────────────────────────────
alter table public.fans
  add column if not exists socials jsonb not null default '{}'::jsonb;

-- ─── 2. Move existing handle → socials.instagram_or_tiktok ─────────
update public.fans
set
  socials = coalesce(socials, '{}'::jsonb)
            || jsonb_build_object('instagram_or_tiktok', handle),
  handle  = null
where handle is not null
  and (handle ~ '[^a-z0-9-]' or handle ~ '^@');

-- ─── 3. Add profile_slug column ────────────────────────────────────
alter table public.fans
  add column if not exists profile_slug text;

-- ─── 4. Backfill profile_slug for everyone ─────────────────────────
update public.fans
set profile_slug = lower(
  coalesce(
    nullif(regexp_replace(coalesce(first_name, ''), '[^a-zA-Z0-9]', '', 'g'), ''),
    'fan'
  )
) || '-' || substring(replace(id::text, '-', ''), 1, 4)
where profile_slug is null;

-- ─── 5. Unique index on profile_slug (case-insensitive) ────────────
create unique index if not exists fans_profile_slug_unique
  on public.fans (lower(profile_slug));

-- ─── 6. Drop old handle unique index ───────────────────────────────
drop index if exists fans_handle_unique;

-- ─── 7. Replace handle trigger with profile_slug trigger ───────────
drop trigger if exists fans_default_handle on public.fans;
drop function if exists public.set_default_fan_handle();

create or replace function public.set_default_fan_profile_slug()
returns trigger
language plpgsql
as $func$
begin
  if new.profile_slug is null then
    new.profile_slug := lower(
      coalesce(
        nullif(regexp_replace(coalesce(new.first_name, ''), '[^a-zA-Z0-9]', '', 'g'), ''),
        'fan'
      )
    ) || '-' || substring(replace(new.id::text, '-', ''), 1, 4);
  end if;
  return new;
end;
$func$;

drop trigger if exists fans_default_profile_slug on public.fans;
create trigger fans_default_profile_slug
  before insert on public.fans
  for each row execute function public.set_default_fan_profile_slug();

-- ─── 8. Verify ─────────────────────────────────────────────────────
-- select
--   count(*) filter (where profile_slug is null) as null_slugs,
--   count(*) as total,
--   count(*) filter (where socials != '{}'::jsonb) as with_socials
-- from public.fans;
-- Expected: null_slugs = 0, total = your fan count.
