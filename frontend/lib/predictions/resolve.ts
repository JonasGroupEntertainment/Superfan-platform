import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve a prediction by marking the correct option, then batch-award
 * `points_for_correct` to every fan who voted for it.
 *
 * Idempotent via `prediction_award_log` (post_id, fan_id) unique. If
 * the resolution is rerun (e.g., admin re-clicks the resolve button),
 * already-awarded fans are skipped silently.
 *
 * Returns counts so the caller can render a confirmation toast.
 *
 * Failure mode: throws if the post isn't a prediction or doesn't exist.
 * Award errors per-fan are logged but don't abort the batch — partial
 * awards persist (the dedupe log rows make a retry safe).
 */
export async function resolvePrediction(opts: {
  postId: string;
  correctOptionId: string;
}): Promise<{
  alreadyResolved: boolean;
  pointsPerWinner: number;
  winnersCount: number;
  awardedCount: number;
  skippedCount: number;
}> {
  const admin = createAdminClient();

  // Load the prediction row
  const { data: post } = await admin
    .from("community_posts")
    .select(
      "id, kind, points_for_correct, resolved_at, correct_option_id, artist_slug",
    )
    .eq("id", opts.postId)
    .maybeSingle();

  if (!post) throw new Error("prediction not found");
  if (post.kind !== "prediction") throw new Error("post is not a prediction");

  const points = (post.points_for_correct as number | null) ?? 0;
  const alreadyResolved = post.resolved_at != null;

  // Stamp resolution if not yet done
  if (!alreadyResolved) {
    const { error } = await admin
      .from("community_posts")
      .update({
        correct_option_id: opts.correctOptionId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", opts.postId);
    if (error) throw error;
  }

  // Find winning voters
  const { data: winnerRows } = await admin
    .from("community_poll_votes")
    .select("fan_id")
    .eq("post_id", opts.postId)
    .eq("option_id", opts.correctOptionId);

  const winnerIds = Array.from(
    new Set((winnerRows ?? []).map((r) => r.fan_id as string)),
  );
  const winnersCount = winnerIds.length;
  if (winnersCount === 0 || points <= 0) {
    return {
      alreadyResolved,
      pointsPerWinner: points,
      winnersCount,
      awardedCount: 0,
      skippedCount: 0,
    };
  }

  // Already-awarded fans (rerun safety)
  const { data: alreadyAwardedRows } = await admin
    .from("prediction_award_log")
    .select("fan_id")
    .eq("post_id", opts.postId);
  const alreadyAwarded = new Set<string>(
    (alreadyAwardedRows ?? []).map((r) => r.fan_id as string),
  );

  const toAward = winnerIds.filter((id) => !alreadyAwarded.has(id));
  let awardedCount = 0;
  const skippedCount = winnerIds.length - toAward.length;

  // Award one fan at a time so a single failure doesn't abort the batch.
  // Volume is bounded (winners per prediction); fine for V1.
  for (const fanId of toAward) {
    try {
      // 1. Try-insert dedupe row first; if conflict, another concurrent
      //    resolve already paid this fan.
      const { error: dedupeErr } = await admin
        .from("prediction_award_log")
        .insert({
          post_id: opts.postId,
          fan_id: fanId,
          points,
          metadata: { kind: "prediction_correct" },
        });
      if (dedupeErr) continue;

      // 2. Read current points + add. We'd love an atomic increment
      //    RPC here; this read-then-write is fine for V1 since
      //    concurrent prediction-resolve writes for the same fan are
      //    extremely rare.
      const { data: fan } = await admin
        .from("fans")
        .select("total_points")
        .eq("id", fanId)
        .maybeSingle();
      const newTotal = ((fan?.total_points as number) ?? 0) + points;
      await admin.from("fans").update({ total_points: newTotal }).eq("id", fanId);

      // 3. Ledger entry for audit
      await admin.from("points_ledger").insert({
        fan_id: fanId,
        delta: points,
        source: "prediction_correct",
        source_ref: `prediction:${opts.postId}`,
        note: "Correct prediction",
      });

      awardedCount += 1;
    } catch (err) {
      console.warn("resolvePrediction: award failed for fan", fanId, err);
    }
  }

  return {
    alreadyResolved,
    pointsPerWinner: points,
    winnersCount,
    awardedCount,
    skippedCount,
  };
}

/**
 * Convenience aggregate query for the prediction card render path.
 * Returns vote distribution + the viewer's option id (if any).
 */
export async function getPredictionState(
  postId: string,
  viewerFanId?: string | null,
): Promise<{
  totalVotes: number;
  countsByOption: Record<string, number>;
  viewerOptionId: string | null;
}> {
  const admin = createAdminClient();
  const [{ data: voteRows }, { data: myVote }] = await Promise.all([
    admin
      .from("community_poll_votes")
      .select("option_id")
      .eq("post_id", postId),
    viewerFanId
      ? admin
          .from("community_poll_votes")
          .select("option_id")
          .eq("post_id", postId)
          .eq("fan_id", viewerFanId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const countsByOption: Record<string, number> = {};
  for (const v of voteRows ?? []) {
    const oid = v.option_id as string;
    countsByOption[oid] = (countsByOption[oid] ?? 0) + 1;
  }

  return {
    totalVotes: (voteRows ?? []).length,
    countsByOption,
    viewerOptionId: (myVote?.option_id as string | undefined) ?? null,
  };
}
