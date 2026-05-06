import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Live stats shown on the signed-out landing — used by the
 * <FoundingFanBlock> countdown and the small "proof" tiles row above
 * the existing How-it-works section.
 *
 * All counts come from the admin client so RLS doesn't filter them.
 * Errors return zeros instead of crashing the marketing page.
 */

export const FOUNDING_TARGET = 500;
export const FOUNDING_CLOSE = new Date("2026-07-16T00:00:00Z");

export type LandingStats = {
  activeArtists: number;
  activeEvents: number;
  foundingFans: number;
  foundingSpotsRemaining: number;
  foundingTarget: number;
  foundingPctClaimed: number;
  daysUntilFoundingCloses: number;
  foundingClosed: boolean;
};

export async function getLandingStats(): Promise<LandingStats> {
  const fallback: LandingStats = {
    activeArtists: 0,
    activeEvents: 0,
    foundingFans: 0,
    foundingSpotsRemaining: FOUNDING_TARGET,
    foundingTarget: FOUNDING_TARGET,
    foundingPctClaimed: 0,
    daysUntilFoundingCloses: 0,
    foundingClosed: false,
  };

  try {
    const admin = createAdminClient();
    const [artistsRes, eventsRes, foundersRes] = await Promise.all([
      admin
        .from("artists")
        .select("slug", { count: "exact", head: true })
        .eq("active", true),
      admin
        .from("artist_events")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      admin
        .from("fan_badges")
        .select("fan_id", { count: "exact", head: true })
        .eq("badge_slug", "founder-fan"),
    ]);

    const foundingFans = foundersRes.count ?? 0;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilFoundingCloses = Math.max(
      0,
      Math.ceil((FOUNDING_CLOSE.getTime() - now.getTime()) / msPerDay),
    );
    const foundingSpotsRemaining = Math.max(0, FOUNDING_TARGET - foundingFans);
    const foundingPctClaimed = Math.min(
      100,
      Math.round((foundingFans / FOUNDING_TARGET) * 100),
    );

    return {
      activeArtists: artistsRes.count ?? 0,
      activeEvents: eventsRes.count ?? 0,
      foundingFans,
      foundingSpotsRemaining,
      foundingTarget: FOUNDING_TARGET,
      foundingPctClaimed,
      daysUntilFoundingCloses,
      foundingClosed: now >= FOUNDING_CLOSE,
    };
  } catch (err) {
    console.warn("getLandingStats failed", err);
    return fallback;
  }
}
