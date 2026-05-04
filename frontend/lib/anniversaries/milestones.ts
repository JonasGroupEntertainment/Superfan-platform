/**
 * Milestone catalog for fan-artist anniversaries.
 *
 * Markers are stored as numeric values in `fan_anniversary_log` so the
 * unique-constraint can dedupe across whole-year and partial-year marks.
 *   - 0.083 = ~1 month  (30/365)
 *   - 0.5   = 6 months  (~180/365)
 *   - 1, 2, 3, … = whole years
 *
 * Point values reward longer fan tenure increasingly. Tunable here
 * without schema impact.
 */

export interface AnniversaryMilestone {
  /** Days from `followed_at` when this fires. */
  daysFromFollow: number;
  /** Numeric marker stored in fan_anniversary_log.anniversary_marker. */
  marker: number;
  /** Points awarded on this anniversary. */
  points: number;
  /** Short label used in the push notification. */
  label: string;
}

export const ANNIVERSARY_MILESTONES: AnniversaryMilestone[] = [
  { daysFromFollow: 30,    marker: 0.083, points: 25,   label: "1 month" },
  { daysFromFollow: 180,   marker: 0.5,   points: 75,   label: "6 months" },
  { daysFromFollow: 365,   marker: 1,     points: 200,  label: "1 year" },
  { daysFromFollow: 730,   marker: 2,     points: 500,  label: "2 years" },
  { daysFromFollow: 1095,  marker: 3,     points: 1000, label: "3 years" },
  { daysFromFollow: 1825,  marker: 5,     points: 2500, label: "5 years" },
];

/** UTC midnight of `at`. */
function utcMidnight(at: Date): Date {
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Given a follow date, which milestone (if any) matches "today"?
 *
 * We compare whole-day deltas in UTC to avoid timezone drift when
 * the cron fires at different wall-clock times.
 */
export function milestoneForToday(
  followedAt: Date,
  today: Date = new Date(),
): AnniversaryMilestone | null {
  const followedMidnight = utcMidnight(followedAt);
  const todayMidnight = utcMidnight(today);
  const deltaDays = Math.round(
    (todayMidnight.getTime() - followedMidnight.getTime()) / DAY_MS,
  );
  return (
    ANNIVERSARY_MILESTONES.find((m) => m.daysFromFollow === deltaDays) ?? null
  );
}
