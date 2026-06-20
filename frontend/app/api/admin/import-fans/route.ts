import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows, communityId } = await request.json();
  const admin = createAdminClient();

  const result = { created: 0, updated: 0, skipped: 0, errors: [] as { row: number; email: string; reason: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push({ row: row._rowIndex ?? i + 2, email: row.email ?? "", reason: "Invalid email" });
      result.skipped++;
      continue;
    }

    const { data: existing } = await admin.from("fans").select("id, socials").eq("email", email).maybeSingle();

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
      const { error } = await admin.from("fans").update(patch).eq("id", existing.id);
      if (error) {
        result.errors.push({ row: row._rowIndex ?? i + 2, email, reason: error.message });
        result.skipped++;
        continue;
      }
      result.updated++;
    } else {
      let authUserId: string | null = null;
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (authError) {
        // User may already exist in auth but not in fans — look them up
        const { data: userList } = await admin.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find((u) => u.email === email);
        if (existingAuthUser) {
          authUserId = existingAuthUser.id;
        } else {
          result.errors.push({ row: row._rowIndex ?? i + 2, email, reason: authError.message });
          result.skipped++;
          continue;
        }
      } else {
        authUserId = authData.user.id;
      }
      const { data: inserted, error } = await admin
        .from("fans")
        .upsert({ id: authUserId, email, ...patch }, { onConflict: "id" })
        .select("id")
        .maybeSingle();
      if (error) {
        result.errors.push({ row: row._rowIndex ?? i + 2, email, reason: error.message });
        result.skipped++;
        continue;
      }
      fanId = inserted?.id ?? null;
      result.created++;
    }

    if (communityId && fanId) {
      await admin.from("fan_community_memberships").upsert(
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

  return NextResponse.json(result);
}
