-- 0034_founder_fan_badge.sql
-- Founding-fan recognition badge. Auto-awarded by the onboarding API to
-- any fan who completes onboarding before 2026-07-15. Will show up
-- alongside their other earned badges on /rewards.

insert into public.badges (slug, name, description, icon, point_value)
values (
  'founder-fan',
  'Founding Fan',
  'Joined Fan Engage during the founding window (before July 15, 2026).',
  '🏅',
  500
)
on conflict (slug) do nothing;

comment on column public.badges.slug is
  'Stable badge identifier. founder-fan is auto-awarded by the onboarding API to fans who complete signup before 2026-07-15.';
