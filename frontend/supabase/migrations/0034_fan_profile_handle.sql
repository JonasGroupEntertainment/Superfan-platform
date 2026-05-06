-- 0034_fan_profile_handle.sql
-- Public fan profile pages — every fan gets a unique handle and an
-- opt-out flag. Default: profile is publicly viewable, but only the
-- public-safe fields are exposed (see lib/data/fan-profile.ts —
-- no email, phone, stripe ids, last login, or moderation state).
-- Fans can opt out by flipping public_profile_enabled to false.
--
-- Handle format: lowercase first_name (alphanum only, "fan" fallback)
-- + 4-char hex suffix from the fan's auth uuid. 16^4 = 65,536
-- possible suffixes per first_name, collision-free for the
-- realistic launch scale.

-- ─── 1. Add columns ────────────────────────────────────────────────
alter table public.fans
  add column if not exists handle text,
  add column if not exists public_profile_enabled boolean not null default true;

-- ─── 2. Backfill handles for existing fans ─────────────────────────
update public.fans
set handle = lower(
  coalesce(
    nullif(regexp_replace(coalesce(first_name, ''), '[^a-zA-Z0-9]', '', 'g'), ''),
    'fan'
  )
) || '-' || substring(replace(id::text, '-', ''), 1, 4)
where handle is null;

-- ─── 3. Unique index on handle (case-insensitive) ──────────────────
create unique index if not exists fans_handle_unique
  on public.fans (lower(handle));

-- ─── 4. Trigger to auto-generate handle on signup ──────────────────
-- Fires before INSERT so new fans always have a handle. Idempotent
-- via DROP IF EXISTS + CREATE.
create or replace function public.set_default_fan_handle()
returns trigger
language plpgsql
as $$
begin
  if new.handle is null then
    new.handle := lower(
      coalesce(
        nullif(regexp_replace(coalesce(new.first_name, ''), '[^a-zA-Z0-9]', '', 'g'), ''),
        'fan'
      )
    ) || '-' || substring(replace(new.id::text, '-', ''), 1, 4);
  end if;
  return new;
end;
$$;

drop trigger if exists fans_default_handle on public.fans;
create trigger fans_default_handle
  before insert on public.fans
  for each row execute function public.set_default_fan_handle();

-- ─── 5. Verify ─────────────────────────────────────────────────────
-- After running, you should see every existing fan with a handle:
--   select count(*) filter (where handle is null) as null_handles,
--          count(*) as total
--   from public.fans;
-- Expected: null_handles = 0, total = your fan count.
