-- Promo codes: free/comped access codes (separate from Stripe discount coupons)
CREATE TABLE public.promo_codes (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT        NOT NULL UNIQUE,           -- case-insensitive match at query time
  description     TEXT,                                  -- internal label
  grants_tier     TEXT        NOT NULL DEFAULT 'premium',-- 'premium' | 'comped'
  community_id    TEXT        NOT NULL DEFAULT '*',      -- '*' = all communities, else specific slug
  max_uses        INT,                                   -- NULL = unlimited
  uses_count      INT         NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracks which fan redeemed which code (enforces one-use-per-fan-per-code)
CREATE TABLE public.promo_code_redemptions (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id   UUID        NOT NULL REFERENCES public.promo_codes(id),
  fan_id          UUID        NOT NULL REFERENCES auth.users(id),
  community_id    TEXT        NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, fan_id)
);

-- Only admins/service role touch these tables
ALTER TABLE public.promo_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Fans can read active codes (needed for the redemption lookup)
CREATE POLICY "fans_read_active_codes"
  ON public.promo_codes FOR SELECT
  USING (active = true);

-- Fans can read their own redemptions
CREATE POLICY "fans_read_own_redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (fan_id = auth.uid());
