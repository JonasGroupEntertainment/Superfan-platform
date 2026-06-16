import { NextResponse } from "next/server";
import { getCurrentCommunityId } from "@/lib/community";
import { getFounderState } from "@/lib/stripe-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const communityId = await getCurrentCommunityId();
    const state = await getFounderState(communityId);
    return NextResponse.json({
      filled: state.founderCount,
      total: state.founderCap,
      remaining: state.slotsRemaining,
    });
  } catch (err) {
    console.error("[founder-slots] error", err);
    return NextResponse.json(
      { error: "Failed to fetch founder slots" },
      { status: 500 },
    );
  }
}
