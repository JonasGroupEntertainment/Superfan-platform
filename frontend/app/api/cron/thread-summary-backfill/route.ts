import { NextResponse } from "next/server";
import { backfillThreadSummaries } from "@/lib/thread-summary/backfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/thread-summary-backfill
 *
 * AI #14: Long-thread summarization. Scheduled every 15 minutes.
 * Finds posts where comment_count >= 8 AND (no summary OR comment_count
 * has grown by ≥5 since last summary) and asks Claude Haiku 4.5 for a
 * 2-3 sentence summary, then writes it back to community_posts.
 * Capped at 10 posts per tick to bound cost.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const started = Date.now();
  const result = await backfillThreadSummaries();

  return NextResponse.json({
    ok: true,
    ...result,
    aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
    durationMs: Date.now() - started,
  });
}
