-- 0033_music_outlet.sql
-- Rename fans.favorite_song → fans.music_outlet
-- Captures preferred music streaming service instead of a free-text song name.

alter table public.fans
  rename column favorite_song to music_outlet;

comment on column public.fans.music_outlet is
  'Preferred music streaming service (Spotify, Apple Music, Amazon Music, TikTok, YouTube, Radio, or freeform "Other" answer).';
