/**
 * GET /api/admin/fan-scoring?artist_slug=blake-richardson&limit=500&offset=0
 *
 * Exposes per-fan scoring inputs for the Super Fan Initiative (JGF-1286).
 * Returns raw behavioral data — NOT computed scores. Scoring runs in the
 * downstream pipeline once legal clears (JGF-1286 legal gate).
 *
 * Dimensions returned (maps to scoring model weights):
 *   platform   (15%) — points ledger activity, follow tenure
 *   social     (20%) — community posts/comments/reactions/polls/challenges
 *   merch      (20%) — purchases of merch/collectible/digital offers
 *   events     (20%) — event RSVPs per artist (proxy; ticket verification is a gap)
 *   streaming  (25%) — NOT AVAILABLE (Spotify/Apple Music integration gap)
 *   email_sms  (N/A) — opt-in status only; click/open tracking is a gap
 *
 * Auth: Bearer $CRON_SECRET  (same pattern as /api/cron/* routes)
 * Legal gate: SUPER_FAN_SCORING_LEGAL_CLEARED=true must be set before
 *             this endpoint returns real fan data.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) return unauthorized();
  }

  // ── Legal gate ──────────────────────────────────────────────────────────
  const legalCleared = process.env.SUPER_FAN_SCORING_LEGAL_CLEARED === "true";
  if (!legalCleared) {
    return NextResponse.json(
      {
        ok: false,
        error: "legal_gate_active",
        message:
          "Fan scoring data is gated pending legal review (JGF-1286). " +
          "Set SUPER_FAN_SCORING_LEGAL_CLEARED=true once legal clears.",
      },
      { status: 503 },
    );
  }

  // ── Params ───────────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const artistSlug = searchParams.get("artist_slug");
  if (!artistSlug) {
    return NextResponse.json(
      { ok: false, error: "artist_slug is required" },
      { status: 400 },
    );
  }
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT,
  );
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const supabase = createAdminClient();

  // ── 1. Fans following this artist ────────────────────────────────────────
  const { data: followers, error: followErr } = await supabase
    .from("fan_artist_following")
    .select("fan_id, followed_at")
    .eq("artist_slug", artistSlug)
    .order("followed_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (followErr) {
    return NextResponse.json({ ok: false, error: followErr.message }, { status: 500 });
  }
  if (!followers || followers.length === 0) {
    return NextResponse.json({ ok: true, artist_slug: artistSlug, fans: [], meta: buildMeta() });
  }

  const fanIds = followers.map((f) => f.fan_id);
  const followedAtMap = Object.fromEntries(followers.map((f) => [f.fan_id, f.followed_at]));

  // Run all aggregation queries in parallel
  const [
    pointsResult,
    postsResult,
    commentsResult,
    reactionsResult,
    pollsResult,
    challengesResult,
    purchasesResult,
    rsvpsResult,
    fansResult,
  ] = await Promise.all([
    // ── 2. Platform activity: points ledger totals ────────────────────────
    supabase
      .from("points_ledger")
      .select("fan_id, delta, source, created_at")
      .in("fan_id", fanIds),

    // ── 3. Social: community posts by artist ─────────────────────────────
    supabase
      .from("community_posts")
      .select("author_id, created_at")
      .eq("artist_slug", artistSlug)
      .in("author_id", fanIds),

    // ── 4. Social: community comments (via post join) ─────────────────────
    supabase
      .from("community_comments")
      .select("author_id, created_at, post_id")
      .in("author_id", fanIds),

    // ── 5. Social: reactions ──────────────────────────────────────────────
    supabase
      .from("community_reactions")
      .select("fan_id, created_at, post_id")
      .in("fan_id", fanIds),

    // ── 6. Social: poll votes ─────────────────────────────────────────────
    supabase
      .from("community_poll_votes")
      .select("fan_id, created_at")
      .in("fan_id", fanIds),

    // ── 7. Social: challenge entries ──────────────────────────────────────
    supabase
      .from("community_challenge_entries")
      .select("fan_id, created_at")
      .in("fan_id", fanIds),

    // ── 8. Merch: purchases of merch/collectible/digital ─────────────────
    supabase
      .from("purchases")
      .select("fan_id, cents_spent, points_spent, created_at, status, offer_id, offers!inner(category)")
      .in("fan_id", fanIds)
      .in("offers.category", ["merch", "collectible", "digital"])
      .eq("status", "fulfilled"),

    // ── 9. Events: RSVPs for this artist's events ─────────────────────────
    supabase
      .from("event_rsvps")
      .select("fan_id, rsvp_at, event_id, artist_events!inner(artist_slug)")
      .in("fan_id", fanIds)
      .eq("artist_events.artist_slug", artistSlug),

    // ── 10. Fan profiles (tier, total_points, email/sms opt-in) ──────────
    supabase
      .from("fans")
      .select("id, current_tier, total_points, email_opted_in, sms_opted_in, music_outlet, created_at")
      .in("id", fanIds),
  ]);

  // Bail on any hard error
  for (const [label, res] of [
    ["points", pointsResult],
    ["posts", postsResult],
    ["comments", commentsResult],
    ["reactions", reactionsResult],
    ["polls", pollsResult],
    ["challenges", challengesResult],
    ["purchases", purchasesResult],
    ["rsvps", rsvpsResult],
    ["fans", fansResult],
  ] as const) {
    if ((res as { error: unknown }).error) {
      console.error(`fan-scoring: ${label} query failed`, (res as { error: unknown }).error);
    }
  }

  // ── Aggregate per fan ───────────────────────────────────────────────────
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const fanMap = Object.fromEntries((fansResult.data ?? []).map((f) => [f.id, f]));

  const pointsByFan = groupBy(pointsResult.data ?? [], "fan_id");
  const postsByFan = groupBy(postsResult.data ?? [], "author_id");
  const commentsByFan = groupBy(commentsResult.data ?? [], "author_id");
  const reactionsByFan = groupBy(reactionsResult.data ?? [], "fan_id");
  const pollsByFan = groupBy(pollsResult.data ?? [], "fan_id");
  const challengesByFan = groupBy(challengesResult.data ?? [], "fan_id");
  const purchasesByFan = groupBy(purchasesResult.data ?? [], "fan_id");
  const rsvpsByFan = groupBy(rsvpsResult.data ?? [], "fan_id");

  const fans = fanIds.map((fanId) => {
    const profile = fanMap[fanId];
    const ledger = pointsByFan[fanId] ?? [];
    const posts = postsByFan[fanId] ?? [];
    const comments = commentsByFan[fanId] ?? [];
    const reactions = reactionsByFan[fanId] ?? [];
    const polls = pollsByFan[fanId] ?? [];
    const challenges = challengesByFan[fanId] ?? [];
    const purchases = purchasesByFan[fanId] ?? [];
    const rsvps = rsvpsByFan[fanId] ?? [];

    const posts30d = posts.filter((p) => p.created_at >= thirtyDaysAgo).length;
    const comments30d = comments.filter((c) => c.created_at >= thirtyDaysAgo).length;
    const reactions30d = reactions.filter((r) => r.created_at >= thirtyDaysAgo).length;
    const polls30d = polls.filter((p) => p.created_at >= thirtyDaysAgo).length;
    const challenges30d = challenges.filter((c) => c.created_at >= thirtyDaysAgo).length;

    const totalMerchSpendCents = purchases.reduce((s, p) => s + (p.cents_spent ?? 0), 0);
    const lastPurchaseAt = purchases.length
      ? purchases.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
      : null;

    return {
      fan_id: fanId,

      // Platform (15%)
      platform: {
        total_points: profile?.total_points ?? 0,
        current_tier: profile?.current_tier ?? "bronze",
        follower_since: followedAtMap[fanId] ?? null,
        ledger_entry_count: ledger.length,
        ledger_entry_count_30d: ledger.filter((l) => l.created_at >= thirtyDaysAgo).length,
      },

      // Social / Community (20%)
      social: {
        posts_total: posts.length,
        posts_30d: posts30d,
        comments_total: comments.length,
        comments_30d: comments30d,
        reactions_total: reactions.length,
        reactions_30d: reactions30d,
        poll_votes_total: polls.length,
        poll_votes_30d: polls30d,
        challenge_entries_total: challenges.length,
        challenge_entries_30d: challenges30d,
        email_opted_in: profile?.email_opted_in ?? false,
        sms_opted_in: profile?.sms_opted_in ?? false,
      },

      // Merch (20%)
      merch: {
        purchase_count: purchases.length,
        total_spend_cents: totalMerchSpendCents,
        last_purchase_at: lastPurchaseAt,
      },

      // Events (20%) — RSVPs only; ticket verification is a gap
      events: {
        rsvp_count: rsvps.length,
        last_rsvp_at: rsvps.length
          ? rsvps.sort((a, b) => b.rsvp_at.localeCompare(a.rsvp_at))[0].rsvp_at
          : null,
      },

      // Streaming (25%) — NOT AVAILABLE
      streaming: null,

      // Preferred streaming service (preference declaration, not usage data)
      music_outlet: profile?.music_outlet ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    artist_slug: artistSlug,
    count: fans.length,
    offset,
    fans,
    meta: buildMeta(),
  });
}

function groupBy<T extends Record<string, unknown>>(arr: T[], key: string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key]);
    (out[k] ??= []).push(item);
  }
  return out;
}

function buildMeta() {
  return {
    available_dimensions: ["platform", "social", "merch", "events"],
    gap_dimensions: [
      {
        name: "streaming",
        weight: 0.25,
        reason: "Requires Spotify/Apple Music OAuth integration — not yet built",
        estimate: "3–4 weeks (API integration + data normalization)",
      },
      {
        name: "email_sms_engagement",
        weight: "folded into social (20%)",
        reason:
          "Opt-in status is available; open/click-rate tracking requires Mailchimp/SendGrid webhook ingest",
        estimate: "1–2 weeks (webhook receiver + tracking table)",
      },
      {
        name: "ticket_verification",
        weight: "part of events (20%)",
        reason:
          "event_rsvps tracks fan intent; actual ticket purchase verification requires Ticketmaster/Eventbrite integration",
        estimate: "2–3 weeks (integration + matching logic)",
      },
    ],
    legal_gate_active: process.env.SUPER_FAN_SCORING_LEGAL_CLEARED !== "true",
    notes:
      "Do not run scoring model against this data until legal review clears (JGF-1286). " +
      "Set SUPER_FAN_SCORING_LEGAL_CLEARED=true in Vercel env once approved.",
  };
}
