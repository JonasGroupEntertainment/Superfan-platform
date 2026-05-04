/**
 * Predictions = community_posts where kind = 'prediction'.
 *
 * Three lifecycle phases:
 *   - "open"      : prediction_closes_at > now and resolved_at is null
 *                   → fans can vote
 *   - "closed"    : prediction_closes_at <= now and resolved_at is null
 *                   → vote window passed; awaiting admin resolution
 *   - "resolved"  : resolved_at is not null
 *                   → correct_option_id is set; correct voters were awarded
 *                   `points_for_correct`
 */

export type PredictionPhase = "open" | "closed" | "resolved";

export interface PredictionPostFields {
  prediction_closes_at: string | null;
  resolved_at: string | null;
  correct_option_id: string | null;
  points_for_correct: number | null;
}

export function predictionPhase(
  fields: PredictionPostFields,
  now: Date = new Date(),
): PredictionPhase {
  if (fields.resolved_at) return "resolved";
  if (
    fields.prediction_closes_at &&
    new Date(fields.prediction_closes_at).getTime() <= now.getTime()
  ) {
    return "closed";
  }
  return "open";
}

export function secondsUntilPredictionClose(
  fields: PredictionPostFields,
  now: Date = new Date(),
): number | null {
  if (!fields.prediction_closes_at) return null;
  const ms = new Date(fields.prediction_closes_at).getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 1000);
}

/** Compact countdown like "2h 14m" / "47m 12s" / "32s". */
export function formatPredictionCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
