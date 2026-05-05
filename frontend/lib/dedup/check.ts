// AI #20: De-dupe submissions
//
// findNearestPost(text, excludeId) — embeds the text, searches existing
// public community_posts via search_embeddings RPC, returns the nearest
// match if cosine distance is below SOFT_DUP_THRESHOLD. Returns null
// (fail-open) on any error so post creation never breaks because of dedupe.

import { createAdminClient } from "@/lib/supabase/admin";
import { cachedEmbedQuery } from "@/lib/search/embed-cache";

// Convert a vector to pgvector literal form. Defined locally to avoid
// taking a hard dependency on the export shape of lib/search/query.ts.
function pgvectorLiteralLocal(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export const DEDUP_THRESHOLDS = {
  // ~92% cosine similarity — almost certainly the same post body.
  hard: 0.08,
  // ~80% cosine similarity — close enough to flag for human review.
  soft: 0.20,
} as const;

const RAW_LIMIT = 10;
const MIN_TEXT_LENGTH = 12; // skip very short posts ("ok", "lol", etc.)

export type DupMatch = {
  postId: string;
  distance: number;
  body: string;
  createdAt: string;
  fanId: string | null;
  artistId: string | null;
};

export async function findNearestPost(
  text: string,
  excludePostId?: string,
): Promise<DupMatch | null> {
  const trimmed = (text ?? "").trim();
  if (trimmed.length < MIN_TEXT_LENGTH) return null;

  let vec: number[] | null = null;
  try {
    vec = await cachedEmbedQuery(trimmed);
  } catch {
    return null;
  }
  if (!vec) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_embeddings", {
    p_query: pgvectorLiteralLocal(vec),
    p_visibility: "public",
    p_limit: RAW_LIMIT,
  });
  if (error || !data) return null;

  const candidates = (data as Array<{
    source_table?: string;
    source_id?: string;
    distance?: number;
  }>).filter(
    (r) =>
      r?.source_table === "community_posts" &&
      r?.source_id &&
      r.source_id !== excludePostId,
  );
  if (candidates.length === 0) return null;

  const top = candidates[0];
  if (top.distance == null || top.distance > DEDUP_THRESHOLDS.soft) return null;

  const { data: post } = await admin
    .from("community_posts")
    .select("id, artist_id, fan_id, body, created_at")
    .eq("id", top.source_id!)
    .maybeSingle();
  if (!post) return null;

  return {
    postId: post.id as string,
    distance: top.distance,
    body: (post as { body?: string }).body ?? "",
    createdAt: (post as { created_at: string }).created_at,
    fanId: (post as { fan_id?: string | null }).fan_id ?? null,
    artistId: (post as { artist_id?: string | null }).artist_id ?? null,
  };
}

export function isHardDuplicate(match: DupMatch | null): boolean {
  return !!match && match.distance < DEDUP_THRESHOLDS.hard;
}
