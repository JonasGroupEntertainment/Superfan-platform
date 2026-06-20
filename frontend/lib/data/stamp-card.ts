import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StampCardData {
  stampsRequired: number;
  stampsEarned: number;
  rewardTitle: string;
  rewardDescription: string | null;
  rewardReady: boolean;
}

export async function getStampCardData(
  artistSlug: string,
  fanId: string,
): Promise<StampCardData | null> {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: config } = await admin
    .from("stamp_card_configs")
    .select("stamps_required, reward_title, reward_description")
    .eq("artist_slug", artistSlug)
    .eq("active", true)
    .maybeSingle();

  if (!config) return null;

  const { count } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("fan_id", fanId)
    .eq("artist_slug", artistSlug);

  const stampsEarned = Math.min(count ?? 0, config.stamps_required as number);

  return {
    stampsRequired: config.stamps_required as number,
    stampsEarned,
    rewardTitle: config.reward_title as string,
    rewardDescription: config.reward_description as string | null,
    rewardReady: stampsEarned >= (config.stamps_required as number),
  };
}
