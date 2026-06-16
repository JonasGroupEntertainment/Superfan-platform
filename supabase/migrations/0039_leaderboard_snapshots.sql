-- Migration 0039: leaderboard_snapshots
-- Stores daily per-community leaderboard rank + point snapshots so the
-- leaderboard-notifications cron can compare today vs yesterday and fire
-- rank-change push notifications.

create table if not exists leaderboard_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  community_slug text        not null,
  fan_id        uuid        not null references fans (id) on delete cascade,
  rank          int         not null,
  points        int         not null,
  snapshot_date date        not null default current_date,
  created_at    timestamptz not null default now(),

  unique (community_slug, fan_id, snapshot_date)
);

create index if not exists leaderboard_snapshots_community_date_idx
  on leaderboard_snapshots (community_slug, snapshot_date);
