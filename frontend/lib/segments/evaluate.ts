/**
 * AI #16: Evaluate a SegmentFilter against the fans table for a given
 * artist. Wraps the evaluate_audience_segment Postgres RPC.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { SegmentFilter, SegmentMatch } from "./types";

export async function evaluateSegment(
  filter: SegmentFilter,
  artistSlug: string,
  limit = 1000,
): Promise<SegmentMatch[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("evaluate_audience_segment", {
    p_filter: filter as unknown as Record<string, unknown>,
    p_artist_slug: artistSlug,
    p_limit: limit,
  });
  if (error) {
    console.warn("[segments] evaluate_audience_segment failed:", error.message);
    return [];
  }
  return (data ?? []) as SegmentMatch[];
}
