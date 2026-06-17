-- AI #17 fraud detection — fraud_signals table.
-- Idempotent. Admin-only RLS via admin_users membership.

create table if not exists public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.fans(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  verdict text not null check (verdict in ('legitimate', 'suspicious', 'unclear')),
  confidence numeric(3, 2) not null default 0,
  triggers text[] not null default '{}',  -- which heuristic(s) fired
  reasons text[] not null default '{}',   -- claude's natural-language reasons
  evidence_json jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'confirmed')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.fraud_signals is
  'AI-flagged fan accounts for human review. Heuristic + Claude verdict. NO auto-action — admin dismisses or confirms.';

create index if not exists idx_fraud_signals_pending
  on public.fraud_signals (status, scanned_at desc)
  where status = 'pending';
create index if not exists idx_fraud_signals_fan
  on public.fraud_signals (fan_id);

alter table public.fraud_signals enable row level security;

drop policy if exists "fraud_signals_super_admin_all" on public.fraud_signals;
create policy "fraud_signals_super_admin_all"
  on public.fraud_signals
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
