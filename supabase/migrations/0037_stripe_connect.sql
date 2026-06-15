-- Migration 0037: Stripe Connect for artist payouts
--
-- Adds Stripe Connect account tracking to the communities table so each
-- artist community can have a connected bank account and receive payouts.
-- Also adds a payout_split_pct column (0–100) for the platform revenue
-- share — default 20 means the platform keeps 20 %, artist receives 80 %.

alter table communities
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarding_complete boolean not null default false,
  add column if not exists payout_split_pct integer not null default 20
    check (payout_split_pct >= 0 and payout_split_pct <= 100);

comment on column communities.stripe_connect_account_id is
  'Stripe Express Connect account ID (acct_...) for this artist. NULL until the artist completes onboarding.';
comment on column communities.stripe_connect_onboarding_complete is
  'True once Stripe has confirmed the account is fully verified and payouts are enabled.';
comment on column communities.payout_split_pct is
  'Percentage of subscription revenue the platform retains. Artist receives (100 - payout_split_pct) %.';
