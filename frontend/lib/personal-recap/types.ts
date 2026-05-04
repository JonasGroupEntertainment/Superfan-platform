/**
 * "Your week" recap — the per-fan stats card on Fan Home.
 *
 * Computed on-the-fly each Fan Home render (no cron, no cache table).
 * The queries are bounded (one fan, last 7 days) so this is fast in
 * practice. Move to a `weekly_recap` cache table later if Fan Home p95
 * starts feeling it.
 */

export interface WeeklyRecap {
  /** ISO timestamp of the start of the rolling 7-day window. */
  windowStart: string;
  /** ISO timestamp of "now" — end of the window. */
  windowEnd: string;
  /** Reactions the fan placed on others' posts/comments this week. */
  reactionsGiven: number;
  /** Comments the fan posted this week. */
  commentsAdded: number;
  /** RSVPs the fan added this week (excludes RSVPs they removed). */
  rsvpsAdded: number;
  /** Sum of POSITIVE points_ledger deltas this week. Refunds netted out. */
  pointsEarned: number;
  /** Slug + display name of the artist the fan engaged with most this week. */
  topArtistSlug: string | null;
  topArtistName: string | null;
  /** Current streak from the fans table (mirror, no recompute). */
  currentStreakDays: number;
  /**
   * True if there's *any* activity to show. When false the caller
   * should hide the tile entirely — an empty recap is worse UX than no
   * recap at all.
   */
  hasActivity: boolean;
}
