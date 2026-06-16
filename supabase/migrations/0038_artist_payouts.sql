-- Migration 0038: Artist payout ledger
--
-- Records each monthly Stripe Transfer made to an artist's Connect account.
-- One row per (community_slug, month_start) pair — enforced by unique index.

create table if not exists artist_payouts (
  id                uuid        primary key default gen_random_uuid(),
  community_slug    text        not null,
  stripe_transfer_id text       not null unique,
  amount_cents      int         not null,
  payout_split_pct  int         not null,
  month_start       date        not null,
  status            text        not null default 'completed',
  created_at        timestamptz not null default now()
);

-- Prevent double-paying the same community for the same month.
create unique index if not exists artist_payouts_community_month_uidx
  on artist_payouts (community_slug, month_start);

comment on table artist_payouts is
  'Ledger of monthly Stripe Transfers sent to artist Connect accounts.';
comment on column artist_payouts.payout_split_pct is
  'Platform-retained percentage at the time of payout (snapshot from communities.payout_split_pct).';
comment on column artist_payouts.month_start is
  'First day of the calendar month this payout covers (YYYY-MM-01).';
