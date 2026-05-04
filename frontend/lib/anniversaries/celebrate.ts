import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/send";
import {
  ANNIVERSARY_MILESTONES,
  milestoneForToday,
  type AnniversaryMilestone,
} from "./milestones";

/**
 * Celebrate a single fan-artist anniversary.
 *
 * Idempotent via the `fan_anniversary_log` (fan_id, artist_slug,
 * anniversary_marker) unique constraint. Re-runs are no-ops at the
 * dedupe row insert step.
 *
 * Steps:
 *   1. INSERT dedupe row (catches re-runs early)
 *   2. fans.total_points += milestone.points (best-effort)
 *   3. points_ledger entry for audit trail
 *   4. push notification with templated message
 *
 * Failure mode: any per-step failure is logged but doesn't abort the
 * batch — partial celebrations are fine since the dedupe row was
 * already written.
 */
export async function celebrateAnniversary(opts: {
  fanId: string;
  artistSlug: string;
  artistName: string;
  followedAt: Date;
  milestone: AnniversaryMilestone;
}): Promise<{ celebrated: boolean }> {
  const admin = createAdminClient();
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);

  const message = buildMessage(opts.artistName, opts.milestone);

  // 1. Try-insert dedupe row
  const { error: dedupeErr } = await admin
    .from("fan_anniversary_log")
    .insert({
      fan_id: opts.fanId,
      artist_slug: opts.artistSlug,
      anniversary_marker: opts.milestone.marker,
      anniversary_date: todayDate,
      points_awarded: opts.milestone.points,
      message,
    });
  if (dedupeErr) {
    // Most likely cause: 23505 unique violation — already celebrated.
    return { celebrated: false };
  }

  // 2. Award points (read current → update; same pattern as other ledger writes)
  try {
    const { data: fan } = await admin
      .from("fans")
      .select("total_points")
      .eq("id", opts.fanId)
      .maybeSingle();
    const newTotal =
      ((fan?.total_points as number) ?? 0) + opts.milestone.points;
    await admin
      .from("fans")
      .update({ total_points: newTotal })
      .eq("id", opts.fanId);
  } catch (err) {
    console.warn("celebrateAnniversary: fan points update failed", err);
  }

  // 3. Ledger entry for audit
  try {
    await admin.from("points_ledger").insert({
      fan_id: opts.fanId,
      delta: opts.milestone.points,
      source: "anniversary",
      source_ref: `anniversary:${opts.artistSlug}:${opts.milestone.marker}`,
      note: `${opts.artistName} ${opts.milestone.label} anniversary`,
    });
  } catch (err) {
    console.warn("celebrateAnniversary: ledger insert failed", err);
  }

  // 4. Push notification (best-effort)
  try {
    await sendNotification({
      fanId: opts.fanId,
      type: "drops",   // V1 reuses the drops bucket; dedicated pref column is V2
      payload: {
        title: `🎉 ${opts.milestone.label} with ${opts.artistName}`,
        body:
          opts.milestone.points > 0
            ? `${message} +${opts.milestone.points} pts to celebrate.`
            : message,
        url: `/artists/${opts.artistSlug}`,
        tag: `anniversary:${opts.artistSlug}:${opts.milestone.marker}`,
      },
      bypassQuietHours: false,
      bypassSmsTierGate: false,
    });
  } catch (err) {
    console.warn("celebrateAnniversary: push failed", err);
  }

  return { celebrated: true };
}

/**
 * V1 templated message. Holds a slot for V2 AI-generated personalization
 * via the existing lib/drafts module.
 */
function buildMessage(artistName: string, m: AnniversaryMilestone): string {
  switch (m.marker) {
    case 0.083:
      return `One month in. Welcome to the ${artistName} family.`;
    case 0.5:
      return `Six months in — you've been here for the journey.`;
    case 1:
      return `One year as a ${artistName} fan. Thanks for sticking with us.`;
    case 2:
      return `Two years strong. The ${artistName} fam wouldn't be the same without you.`;
    case 3:
      return `Three full years. You're part of the story now.`;
    case 5:
      return `Five years. Founder energy. ${artistName} sees you.`;
    default:
      return `${m.label} with ${artistName}. Cheers to many more.`;
  }
}

/**
 * Daily cron entry point. Scans `fan_artist_following` for anniversary
 * matches today, and celebrates each one.
 *
 * Returns counts so the cron route can report back. Errors per-row are
 * logged but don't abort the batch.
 */
export async function runDailyAnniversaryScan(today: Date = new Date()): Promise<{
  scanned: number;
  celebrated: number;
  skipped: number;
  errors: number;
}> {
  const result = { scanned: 0, celebrated: 0, skipped: 0, errors: 0 };
  const admin = createAdminClient();

  // To keep the scan bounded, we look up follows whose age in days
  // matches one of the known milestones — i.e., for each milestone day
  // count, find follows whose followed_at is exactly that many days old.
  for (const m of ANNIVERSARY_MILESTONES) {
    const target = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - m.daysFromFollow,
      ),
    );
    const targetIso = target.toISOString().slice(0, 10);
    const nextDay = new Date(target.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: follows } = await admin
      .from("fan_artist_following")
      .select("fan_id, artist_slug, followed_at")
      .gte("followed_at", `${targetIso}T00:00:00Z`)
      .lt("followed_at", `${nextDay}T00:00:00Z`);

    for (const row of follows ?? []) {
      result.scanned += 1;
      const fanId = row.fan_id as string;
      const artistSlug = row.artist_slug as string;
      const followedAt = new Date(row.followed_at as string);

      // Sanity: confirm milestoneForToday matches the loop variable.
      const ms = milestoneForToday(followedAt, today);
      if (!ms || ms.marker !== m.marker) {
        result.skipped += 1;
        continue;
      }

      try {
        const { data: artist } = await admin
          .from("artists")
          .select("name")
          .eq("slug", artistSlug)
          .maybeSingle();
        const artistName =
          (artist?.name as string | undefined) ?? artistSlug;

        const { celebrated } = await celebrateAnniversary({
          fanId,
          artistSlug,
          artistName,
          followedAt,
          milestone: m,
        });
        if (celebrated) result.celebrated += 1;
        else result.skipped += 1;
      } catch (err) {
        console.warn("anniversary scan: celebrate failed", { fanId, artistSlug, err });
        result.errors += 1;
      }
    }
  }

  return result;
}
