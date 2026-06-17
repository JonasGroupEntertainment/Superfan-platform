-- AI alt-text — adds community_posts.image_alt column.
-- Idempotent. Safe to re-run.

alter table public.community_posts
  add column if not exists image_alt text;

comment on column public.community_posts.image_alt is
  'AI-generated (Claude Haiku vision) alt text for image_url. Editable by fan at submit time. Used by post-card img tag for accessibility + SEO. NULL if post has no image.';
