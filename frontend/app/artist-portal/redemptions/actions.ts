"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("community_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!adminRow) throw new Error("Forbidden");
  return { communityId: adminRow.community_id as string };
}

export async function fulfillRedemptionAction(formData: FormData) {
  const { communityId } = await requireOwner();
  const redemptionId = String(formData.get("redemption_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!redemptionId) return { error: "Missing redemption_id" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reward_redemptions")
    .update({
      status: "fulfilled",
      fulfillment_note: note || null,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", redemptionId)
    .eq("community_id", communityId);

  if (error) return { error: error.message };
  revalidatePath("/artist-portal/redemptions");
  return { success: true as const };
}

export async function cancelRedemptionPortalAction(formData: FormData) {
  const { communityId } = await requireOwner();
  const redemptionId = String(formData.get("redemption_id") ?? "").trim();
  const fanId = String(formData.get("fan_id") ?? "").trim();
  const pointCost = parseInt(String(formData.get("point_cost") ?? "0"), 10) || 0;
  if (!redemptionId || !fanId) return { error: "Missing fields" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reward_redemptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", redemptionId)
    .eq("community_id", communityId);

  if (error) return { error: error.message };

  if (pointCost > 0) {
    const { data: fan } = await supabase
      .from("fans")
      .select("total_points")
      .eq("id", fanId)
      .maybeSingle();
    const current = (fan?.total_points as number | null) ?? 0;
    await supabase.from("fans").update({ total_points: current + pointCost }).eq("id", fanId);
    await supabase.from("points_ledger").insert([{
      fan_id: fanId,
      delta: pointCost,
      source: "reward_redemption",
      source_ref: `redemption:${redemptionId}:refund`,
      note: "Refunded: redemption cancelled",
    }]);
  }

  revalidatePath("/artist-portal/redemptions");
  return { success: true as const };
}
