-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0036: Influencer onboarding & promo code attribution
-- Creates influencers table, influencer_promo_codes table, and supporting indexes
-- Safe to re-run (idempotent).
-- ────────────────────────────────────────────────────────────────────────────

-- ─── Influencers (platform handles: TikTok, Instagram, YouTube) ────────────
create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  platform text not null,
  real_name text,
  artist_slug text not null references public.artists(slug) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_influencers_artist
  on public.influencers (artist_slug, platform);

-- ─── Influencer promo codes (discount attribution & tracking) ───────────────
create table if not exists public.influencer_promo_codes (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  code text not null unique,
  discount_type text not null,
  discount_value integer not null,
  max_redemptions integer,
  current_redemptions integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_promo_codes_influencer
  on public.influencer_promo_codes (influencer_id);

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table public.influencers enable row level security;
alter table public.influencer_promo_codes enable row level security;

-- Public read for active influencers (anyone can see published influencer links)
drop policy if exists influencers_public_read on public.influencers;
create policy influencers_public_read on public.influencers
  for select using (status = 'active');

-- Promo codes readable by any authenticated user (needed for signup redemption)
drop policy if exists promo_codes_read on public.influencer_promo_codes;
create policy promo_codes_read on public.influencer_promo_codes
  for select to authenticated using (true);

-- Writes to influencers + promo_codes happen via admin service role (bypasses RLS)

-- ─── Smoke-test queries ────────────────────────────────────────────────────
-- Verify influencers exist and have promo codes assigned:
-- select i.handle, i.platform, count(p.id) as promo_code_count
-- from public.influencers i
-- left join public.influencer_promo_codes p on p.influencer_id = i.id
-- where i.status = 'active'
-- group by i.id, i.handle, i.platform
-- order by i.created_at desc;
