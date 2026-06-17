-- ────────────────────────────────────────────────────────────────────────────
-- Fan Engage — 0040: Add Bailee Madison (fan-ngaj.com/bailee-madison)
--
-- Provisions the community + artist rows for Bailee Madison.
-- Starts INACTIVE — flip active=true when:
--   (a) Fan Engage agreement is signed (JGF-1421), and
--   (b) hi-res branding assets are received.
--
-- Bio, social links, and hero image are populated from public intake data
-- (JGF-1373). Asset slots are left as nulls so they can be filled via
-- admin panel or a follow-up migration without code changes.
--
-- Idempotent via ON CONFLICT DO UPDATE.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── 1. Community row ─────────────────────────────────────────────────────
insert into public.communities (
  slug,
  display_name,
  type,
  tagline,
  bio,
  accent_from,
  accent_to,
  subdomain,
  active,
  sort_order
) values (
  'bailee-madison',
  'Bailee Madison',
  'artist',
  'Actress. Artist. Unapologetically herself.',
  'Bailee Madison is a Fort Lauderdale–born, Nashville-raised actress and emerging music artist with over 20 years in the industry. Known for Bridge to Terabithia, Good Witch (Hallmark, 6 seasons), and Pretty Little Liars: Original Sin (HBO Max), Bailee made her music debut with the single "Kinda Fun" on Red Van Records in 2024. She is managed by Jonas Group Entertainment (music) and TFC Management (acting).',
  '#8b5cf6',
  '#e879f9',
  'baileemadison',
  false,   -- activate after agreement is signed + assets received
  7
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  type         = excluded.type,
  tagline      = excluded.tagline,
  bio          = excluded.bio,
  accent_from  = excluded.accent_from,
  accent_to    = excluded.accent_to,
  subdomain    = excluded.subdomain,
  sort_order   = excluded.sort_order;


-- ─── 2. Artist row ────────────────────────────────────────────────────────
insert into public.artists (
  slug,
  name,
  tagline,
  bio,
  hero_image,
  hero_focal_x,
  hero_focal_y,
  accent_from,
  accent_to,
  genres,
  social,
  active,
  sort_order
) values (
  'bailee-madison',
  'Bailee Madison',
  'Actress. Artist. Unapologetically herself.',
  'Bailee Madison is a Fort Lauderdale–born, Nashville-raised actress and emerging music artist with over 20 years in the industry. Known for Bridge to Terabithia, Good Witch (Hallmark, 6 seasons), and Pretty Little Liars: Original Sin (HBO Max), Bailee made her music debut with the single "Kinda Fun" on Red Van Records in 2024. She is managed by Jonas Group Entertainment (music) and TFC Management (acting).',
  null,   -- hero image pending; update via admin panel when assets arrive
  50,
  35,
  '#8b5cf6',
  '#e879f9',
  array['Pop', 'Indie Pop']::text[],
  '[
    {"label": "Instagram", "href": "https://www.instagram.com/baileemadison/"},
    {"label": "Twitter / X", "href": "https://twitter.com/BaileeMadison"}
  ]'::jsonb,
  false,  -- activate after agreement is signed + assets received
  7
)
on conflict (slug) do update set
  name         = excluded.name,
  tagline      = excluded.tagline,
  bio          = excluded.bio,
  accent_from  = excluded.accent_from,
  accent_to    = excluded.accent_to,
  genres       = excluded.genres,
  social       = excluded.social,
  sort_order   = excluded.sort_order;
