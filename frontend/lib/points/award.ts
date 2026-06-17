import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Award points to a fan — the single authoritative function for all
 * point grants in the platform.
 *
 * Writes to three places atomically (best-effort):
 *   1. points_ledger          — immutable audit trail, one row per event
 *   2. fans.total_points      — legacy denormalised total (still read by
 *                               some admin/analytics queries)
 *   3. fan_community_memberships.total_points — the UI source of truth
 *                               read by getCurrentFanKpis() and shown on
 *                               Fan Home, Rewards, and tier progress
 *
 * Pass the admin client so this works in server actions, API routes, and
 * cron jobs alike. communityId defaults to "raelynn" as the platform
 * currently operates as single-tenant; update callers when multi-tenant.
 */
export async function awardPoints(
  admin: SupabaseClient,
  {
    fanId,
    delta,
    source,
    sourceRef,
    note,
    communityId = "raelynn",
  }: {
    fanId: string;
    delta: number;
    source: string;
    sourceRef?: string;
    note?: string;
    communityId?: string;
  },
): Promise<void> {
  // 1. Ledger entry (audit trail)
  await admin.from("points_ledger").insert({
    fan_id: fanId,
    delta,
    source,
    ...(sourceRef ? { source_ref: sourceRef } : {}),
    ...(note ? { note } : {}),
  });

  // 2. fans.total_points (legacy denormalised column)
  const { data: fanRow } = await admin
    .from("fans")
    .select("total_points")
    .eq("id", fanId)
    .maybeSingle();
  await admin
    .from("fans")
    .update({ total_points: ((fanRow?.total_points as number) ?? 0) + delta })
    .eq("id", fanId);

  // 3. fan_community_memberships.total_points (UI source of truth)
  const { data: membership } = await admin
    .from("fan_community_memberships")
    .select("total_points")
    .eq("fan_id", fanId)
    .eq("community_id", communityId)
    .maybeSingle();

  if (membership) {
    await admin
      .from("fan_community_memberships")
      .update({
        total_points: ((membership.total_points as number) ?? 0) + delta,
      })
      .eq("fan_id", fanId)
      .eq("community_id", communityId);
  }
}
