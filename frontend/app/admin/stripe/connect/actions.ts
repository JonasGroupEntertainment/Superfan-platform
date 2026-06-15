"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminContext } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

const RETURN_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://fan-engage-pearl.vercel.app") +
  "/admin/stripe/connect";

/**
 * Create or retrieve a Stripe Express Connect account for a community,
 * then return an Account Link URL for the artist to complete onboarding
 * (bank info, identity verification, etc.).
 */
/**
 * Create or retrieve a Stripe Express Connect account for a community,
 * then redirect the admin to Stripe's hosted onboarding flow where the
 * artist enters their bank details.
 */
export async function createConnectOnboardingLinkAction(
  formData: FormData,
): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx?.isSuperAdmin) throw new Error("Super-admin only");

  const communityId = String(formData.get("community_id") ?? "").trim();
  if (!communityId) throw new Error("Missing community_id");

  const admin = createAdminClient();
  const { data: community } = await admin
    .from("communities")
    .select("slug, display_name, stripe_connect_account_id")
    .eq("slug", communityId)
    .maybeSingle();

  if (!community) throw new Error("Community not found");

  const stripe = getStripe();

  let accountId = community.stripe_connect_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { community_id: communityId, display_name: community.display_name as string },
    });
    accountId = account.id;
    await admin
      .from("communities")
      .update({ stripe_connect_account_id: accountId })
      .eq("slug", communityId);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: RETURN_URL + "?refresh=" + communityId,
    return_url: RETURN_URL + "?onboarded=" + communityId,
    type: "account_onboarding",
  });

  redirect(link.url);
}

/**
 * Update the payout split percentage for a community.
 */
export async function updatePayoutSplitAction(formData: FormData): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx?.isSuperAdmin) throw new Error("Super-admin only");

  const communityId = String(formData.get("community_id") ?? "").trim();
  const pct = parseInt(String(formData.get("payout_split_pct") ?? "20"), 10);
  if (!communityId || isNaN(pct) || pct < 0 || pct > 100) {
    throw new Error("Invalid input");
  }

  const admin = createAdminClient();
  await admin
    .from("communities")
    .update({ payout_split_pct: pct })
    .eq("slug", communityId);

  revalidatePath("/admin/stripe/connect");
}

/**
 * Update subscription pricing for a community (in-DB only — does NOT
 * create new Stripe Prices; existing subscribers keep their current price
 * until they re-subscribe). Use /admin/stripe/seed to push new Stripe
 * Prices after changing the DB values here.
 */
export async function updatePricingAction(formData: FormData): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx?.isSuperAdmin) throw new Error("Super-admin only");

  const communityId = String(formData.get("community_id") ?? "").trim();
  const monthly = parseInt(String(formData.get("monthly_price_cents") ?? ""), 10);
  const annual = parseInt(String(formData.get("annual_price_cents") ?? ""), 10);

  if (!communityId || isNaN(monthly) || isNaN(annual)) throw new Error("Invalid input");
  if (monthly < 100 || annual < 100) throw new Error("Minimum price is $1.00");

  const admin = createAdminClient();
  await admin
    .from("communities")
    .update({ monthly_price_cents: monthly, annual_price_cents: annual })
    .eq("slug", communityId);

  revalidatePath("/admin/stripe/connect");
  revalidatePath("/admin/stripe/seed");
}

/**
 * Mark a Connect account as onboarding-complete after checking its status
 * with Stripe. Called from the return URL handler.
 */
export async function syncConnectStatusAction(
  formData: FormData,
): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx?.isSuperAdmin) throw new Error("Super-admin only");

  const communityId = String(formData.get("community_id") ?? "").trim();
  if (!communityId) throw new Error("Missing community_id");

  const admin = createAdminClient();
  const { data: community } = await admin
    .from("communities")
    .select("stripe_connect_account_id")
    .eq("slug", communityId)
    .maybeSingle();

  const accountId = community?.stripe_connect_account_id as string | null;
  if (!accountId) throw new Error("No Connect account for this community");

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const complete =
    account.details_submitted &&
    (account.payouts_enabled ?? false);

  await admin
    .from("communities")
    .update({ stripe_connect_onboarding_complete: complete })
    .eq("slug", communityId);

  revalidatePath("/admin/stripe/connect");
}
