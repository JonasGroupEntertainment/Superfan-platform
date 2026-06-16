import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/payout-artists
 *
 * Scheduled monthly (e.g. 1st of each month, 06:00 UTC via vercel.json).
 * For every community whose Stripe Connect onboarding is complete:
 *   1. Sum revenue from fan_subscriptions (active) and purchases for the
 *      prior calendar month.
 *   2. Calculate artist share = revenue * (100 - payout_split_pct) / 100.
 *   3. If share > 0 and no artist_payouts row exists for this month:
 *      a. Create a Stripe Transfer to the community's Connect account.
 *      b. Insert an artist_payouts ledger row.
 *
 * Returns { processed, transferred, skipped, errors }.
 */

interface PayoutResult {
  processed: number;
  transferred: number;
  skipped: number;
  errors: Array<{ community_slug: string; error: string }>;
}

/** First day of the current calendar month as YYYY-MM-DD (runtime date). */
function thisMonthStart(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** ISO timestamp range for the calendar month that just ended. */
function priorMonthRange(): { start: string; end: string } {
  const now = new Date();
  // First moment of this month (UTC)
  const thisMonthFirst = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  // First moment of last month (UTC)
  const lastMonthFirst = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  return {
    start: lastMonthFirst.toISOString(),
    end: thisMonthFirst.toISOString(),
  };
}

export async function GET(request: Request) {
  // Auth: verify CRON_SECRET bearer token
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result: PayoutResult = {
    processed: 0,
    transferred: 0,
    skipped: 0,
    errors: [],
  };

  const monthStart = thisMonthStart(); // e.g. "2026-06-01" — the month we're paying out now
  const { start: periodStart, end: periodEnd } = priorMonthRange();

  const admin = createAdminClient();
  const stripe = getStripe();

  // Fetch all communities that are ready to receive payouts
  const { data: communities, error: commErr } = await admin
    .from("communities")
    .select(
      "slug, stripe_connect_account_id, payout_split_pct, monthly_price_cents, annual_price_cents",
    )
    .eq("stripe_connect_onboarding_complete", true);

  if (commErr) {
    return NextResponse.json(
      { error: `Failed to query communities: ${commErr.message}` },
      { status: 500 },
    );
  }

  for (const community of communities ?? []) {
    result.processed += 1;
    const slug = community.slug as string;
    const accountId = community.stripe_connect_account_id as string;
    const splitPct = (community.payout_split_pct as number) ?? 20;
    const artistPct = 100 - splitPct;
    const monthlyPrice = (community.monthly_price_cents as number) ?? 0;
    const annualPrice = (community.annual_price_cents as number) ?? 0;

    try {
      // --- Check for existing payout this month (idempotency guard) ---
      const { data: existing } = await admin
        .from("artist_payouts")
        .select("id")
        .eq("community_slug", slug)
        .eq("month_start", monthStart)
        .maybeSingle();

      if (existing) {
        result.skipped += 1;
        continue;
      }

      // --- Sum subscription revenue for the prior month ---
      // Revenue is derived from fan_community_memberships: count active
      // premium fans whose subscription was live during the period, then
      // multiply by the community's price for their billing period.
      // Monthly subscribers contribute monthly_price_cents; annual
      // subscribers contribute annual_price_cents / 12 (their per-month share).
      const { data: subRows, error: subErr } = await admin
        .from("fan_community_memberships")
        .select("billing_period")
        .eq("community_id", slug)
        .in("subscription_tier", ["premium", "past_due"])
        .lte("created_at", periodEnd)   // joined before the period ended
        .or(`current_period_end.is.null,current_period_end.gt.${periodStart}`); // still active during period

      if (subErr) throw new Error(`subscriptions query: ${subErr.message}`);

      const subRevenue = (subRows ?? []).reduce(
        (acc: number, row: { billing_period: string | null }) => {
          if (row.billing_period === "annual") {
            return acc + Math.round(annualPrice / 12);
          }
          return acc + monthlyPrice;
        },
        0,
      );

      // --- Sum purchase revenue for the prior month ---
      const { data: purchaseRows, error: purchErr } = await admin
        .from("purchases")
        .select("amount_cents")
        .eq("community_slug", slug)
        .eq("status", "completed")
        .gte("created_at", periodStart)
        .lt("created_at", periodEnd);

      if (purchErr) throw new Error(`purchases query: ${purchErr.message}`);

      const purchRevenue = (purchaseRows ?? []).reduce(
        (acc: number, row: { amount_cents: number }) =>
          acc + (row.amount_cents ?? 0),
        0,
      );

      const totalRevenue = subRevenue + purchRevenue;
      const artistShare = Math.floor((totalRevenue * artistPct) / 100);

      if (artistShare <= 0) {
        result.skipped += 1;
        continue;
      }

      // --- Create Stripe Transfer to the artist's Connect account ---
      const transfer = await stripe.transfers.create({
        amount: artistShare,
        currency: "usd",
        destination: accountId,
        metadata: {
          community_slug: slug,
          month_start: monthStart,
          payout_split_pct: String(splitPct),
        },
      });

      // --- Record in ledger ---
      const { error: insertErr } = await admin.from("artist_payouts").insert({
        community_slug: slug,
        stripe_transfer_id: transfer.id,
        amount_cents: artistShare,
        payout_split_pct: splitPct,
        month_start: monthStart,
        status: "completed",
      });

      if (insertErr) {
        // Transfer went through but we failed to record it — log prominently
        // so it can be reconciled manually, but don't count as an error that
        // blocks other communities.
        result.errors.push({
          community_slug: slug,
          error: `Transfer ${transfer.id} created but ledger insert failed: ${insertErr.message}`,
        });
        result.transferred += 1; // still transferred
        continue;
      }

      result.transferred += 1;
    } catch (err) {
      result.errors.push({
        community_slug: slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    month_start: monthStart,
    ...result,
  });
}
