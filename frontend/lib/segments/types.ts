/**
 * AI #16: Auto-segmentation — public type surface.
 *
 * SegmentFilter is a constrained JSON schema. Claude's free-text→filter
 * generator produces this shape, and the SQL evaluator strictly accepts
 * only these keys. Adding a new dimension means: extend this type +
 * extend `validateFilter` in generate.ts + extend the evaluator's CTE.
 */

export type FanTier = "bronze" | "silver" | "gold" | "platinum";
export const FAN_TIERS: readonly FanTier[] = ["bronze", "silver", "gold", "platinum"];

export type SegmentFilter = {
  tiers?: FanTier[];
  total_points_min?: number;
  total_points_max?: number;
  city_contains?: string;
  interest_contains?: string;
  sms_opted_in?: boolean;
  email_opted_in?: boolean;
  signup_within_days?: number;
  signup_older_than_days?: number;
  min_posts_last_30d?: number;
};

export type SegmentMatch = {
  fan_id: string;
  email: string;
  first_name: string | null;
  city: string | null;
  current_tier: FanTier;
  total_points: number;
  posts_30d: number;
};

export type SegmentRow = {
  id: string;
  artist_slug: string;
  name: string;
  description_input: string | null;
  filter_json: SegmentFilter;
  member_count: number;
  fan_ids: string[];
  created_at: string;
  refreshed_at: string;
};
