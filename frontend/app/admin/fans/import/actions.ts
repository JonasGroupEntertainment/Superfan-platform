"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

export interface ImportRow {
  email: string;
  first_name?: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  city?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; email: string; reason: string }[];
}

/**
 * Upserts fans from a parsed CSV. Matches on email — creates a new fan row
 * if none exists, otherwise merges the supplied fields in (never overwrites
 * with blank values). Social handles land in fans.socials jsonb.
 * If communityId is provided, also creates/upserts a fan_community_memberships
 * row to segment the fan to that artist community. No emails are sent.
 */
export async function importFansAction(
  rows: ImportRow[],
  communityId?: string,
): Promise<ImportResult> {
  await getAdminUser();
  const admin = createAdminClient();

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push({ row: i + 2, email: row.email ?? "", reason: "Invalid email" });
      result.skipped++;
      continue;
    }

    // Look up existing fan by email
    const { data: existing } = await admin
      .from("fans")
      .select("id, socials")
      .eq("email", email)
      .maybeSingle();

    // Build socials patch — merge with existing, never blank out
    const existingSocials = (existing?.socials as Record<string, string> | null) ?? {};
    const newSocials: Record<string, string> = { ...existingSocials };
    if (row.instagram?.trim()) newSocials.instagram = row.instagram.trim().replace(/^@/, "");
    if (row.tiktok?.trim()) newSocials.tiktok = row.tiktok.trim().replace(/^@/, "");

    const patch: Record<string, unknown> = { socials: newSocials };
    if (row.first_name?.trim()) patch.first_name = row.first_name.trim();
    if (row.phone?.trim()) patch.phone = row.phone.trim();
    if (row.city?.trim()) patch.city = row.city.trim();

    let fanId: string | null = existing?.id ?? null;

    if (existing) {
      const { error } = await admin
        .from("fans")
        .update(patch)
        .eq("id", existing.id);
      if (error) {
        result.errors.push({ row: i + 2, email, reason: error.message });
        result.skipped++;
        continue;
      } else {
        result.updated++;
      }
    } else {
      const { data: inserted, error } = await admin
        .from("fans")
        .insert({ id: crypto.randomUUID(), email, ...patch })
        .select("id")
        .maybeSingle();
      if (error) {
        result.errors.push({ row: i + 2, email, reason: error.message });
        result.skipped++;
        continue;
      } else {
        fanId = inserted?.id ?? null;
        result.created++;
      }
    }

    // Assign to community if specified — no emails sent, just a membership row.
    if (communityId && fanId) {
      await admin
        .from("fan_community_memberships")
        .upsert(
          {
            fan_id: fanId,
            community_id: communityId,
            total_points: 0,
            current_tier: "bronze",
            status: "active",
            joined_at: new Date().toISOString(),
          },
          { onConflict: "fan_id,community_id", ignoreDuplicates: true },
        );
    }
  }

  return result;
}
