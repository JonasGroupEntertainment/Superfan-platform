"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminContext } from "@/lib/admin";
import { broadcastSms, broadcastEmail } from "@/lib/broadcast";

export type BroadcastFormResult = {
  ok: boolean;
  smsSent?: number;
  emailSent?: number;
  recipientCount?: number;
  error?: string;
};

export async function sendBroadcast(
  formData: FormData,
): Promise<BroadcastFormResult> {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const artistSlug = String(formData.get("artist_slug") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const tierFilter = String(formData.get("tier_filter") ?? "all");
  const channel = String(formData.get("channel") ?? "sms") as "sms" | "email" | "both";

  if (!artistSlug || !message) {
    return { ok: false, error: "Artist and message are required." };
  }

  if (!ctx.isSuperAdmin && !ctx.communities.includes(artistSlug)) {
    return { ok: false, error: "You can only broadcast to your own artist community." };
  }

  let allowedFanIds: string[] | null = null;
  if (tierFilter !== "all") {
    const admin = createAdminClient();
    const tierRank: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    const minRank = tierRank[tierFilter] ?? 0;
    const allowedTiers = Object.entries(tierRank)
      .filter(([, rank]) => rank >= minRank)
      .map(([slug]) => slug);

    const { data: memberships } = await admin
      .from("fan_community_memberships")
      .select("fan_id, current_tier")
      .eq("community_id", artistSlug)
      .in("current_tier", allowedTiers);

    allowedFanIds = (memberships ?? []).map((m) => m.fan_id as string);
    if (allowedFanIds.length === 0) {
      return { ok: false, error: "No fans match this tier filter." };
    }
  }

  const tierLabel =
    tierFilter === "all"
      ? ""
      : `[${tierFilter[0].toUpperCase() + tierFilter.slice(1)}+ fans] `;

  let smsSent = 0;
  let emailSent = 0;

  if (channel === "sms" || channel === "both") {
    const result = await broadcastSms({ body: tierLabel + message, artistSlug });
    smsSent = result.sent;
  }

  if (channel === "email" || channel === "both") {
    const result = await broadcastEmail({
      subject: `Message from ${artistSlug}`,
      body: `<p>${(tierLabel + message).replace(/\n/g, "<br>")}</p>`,
    });
    emailSent = result.sent;
  }

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .insert({
      artist_slug: artistSlug,
      title: `Broadcast: ${message.slice(0, 60)}${message.length > 60 ? "…" : ""}`,
      description: `Tier: ${tierFilter} · Channel: ${channel}`,
      created_by: ctx.user.id,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (campaign) {
    await admin.from("campaign_items").insert({
      campaign_id: campaign.id,
      item_kind: channel === "both" ? "sms" : channel,
      ref_id: null,
      metadata: { sent: smsSent + emailSent, tier_filter: tierFilter },
    });
  }

  return {
    ok: true,
    smsSent,
    emailSent,
    recipientCount: allowedFanIds?.length ?? smsSent + emailSent,
  };
}

export async function previewRecipientCount(
  artistSlug: string,
  tierFilter: string,
  channel: "sms" | "email" | "both",
): Promise<number> {
  const admin = createAdminClient();
  const optCol = channel === "email" ? "email_opted_in" : "sms_opted_in";

  const { data: followers } = await admin
    .from("fan_artist_following")
    .select("fan_id")
    .eq("artist_slug", artistSlug);

  const followerIds = (followers ?? []).map((f) => f.fan_id as string);
  if (followerIds.length === 0) return 0;

  let query = admin
    .from("fans")
    .select("id", { count: "exact", head: true })
    .eq(optCol, true)
    .eq("suspended", false)
    .in("id", followerIds);

  if (tierFilter !== "all") {
    const tierRank: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    const minRank = tierRank[tierFilter] ?? 0;
    const allowedTiers = Object.entries(tierRank)
      .filter(([, r]) => r >= minRank)
      .map(([t]) => t);

    const { data: tieredFans } = await admin
      .from("fan_community_memberships")
      .select("fan_id")
      .eq("community_id", artistSlug)
      .in("current_tier", allowedTiers);

    const tieredIds = (tieredFans ?? []).map((m) => m.fan_id as string);
    query = query.in("id", tieredIds);
  }

  const { count } = await query;
  return count ?? 0;
}
