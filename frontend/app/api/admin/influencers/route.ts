import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/influencers?artist_slug=<slug>
 * POST /api/admin/influencers — create or update influencer
 *
 * Protected by admin auth.
 */

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Unauthorized");
  }
  return admin;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const artistSlug = searchParams.get("artist_slug");

    const db = createAdminClient();
    let query = db
      .from("influencers")
      .select("id, handle, platform, real_name, artist_slug, status, created_at");

    if (artistSlug) {
      query = query.eq("artist_slug", artistSlug);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, handle, platform, real_name, artist_slug, status } = body;

    if (!handle || !platform || !artist_slug) {
      return NextResponse.json(
        { ok: false, error: "handle, platform, and artist_slug are required" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    if (id) {
      // Update existing
      const { data, error } = await db
        .from("influencers")
        .update({ handle, platform, real_name, artist_slug, status: status || "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data });
    } else {
      // Create new
      const { data, error } = await db
        .from("influencers")
        .insert({
          handle,
          platform,
          real_name: real_name || null,
          artist_slug,
          status: status || "active",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data }, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 401 },
    );
  }
}
