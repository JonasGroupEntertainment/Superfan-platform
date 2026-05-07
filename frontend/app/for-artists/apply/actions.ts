"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Simplified Step 1 artist application server action.
 *
 * Maps the 7-field public form into existing `applications` columns
 * so no migration is needed. Detailed onboarding fields (slug, bio,
 * tagline, full social pack, manager info, distribution, monthly
 * listeners, tour dates, founder tier interest) move to the existing
 * /admin/<slug>/setup wizard run by the team after acceptance.
 *
 * Field mapping:
 *   form: display_name      → applications.display_name
 *   form: contact_name      → applications.contact_name
 *   form: contact_email     → applications.contact_email
 *   form: primary_genre     → applications.genres        (single-element array)
 *   form: primary_link      → applications.social        ([{label: 'Primary', href}])
 *   form: launch_timing     → applications.expected_launch_date
 *   form: goals_note        → applications.community_pitch
 */

const LAUNCH_TIMING_LABELS: Record<string, string> = {
  asap: "ASAP",
  "30d": "Within 30 days",
  "60d": "Within 60 days",
  "90d_plus": "90+ days out",
  exploring: "Just exploring",
};

export async function submitArtistApplicationAction(
  formData: FormData,
): Promise<void> {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : null;
  };

  const display_name = get("display_name");
  const contact_name = get("contact_name");
  const contact_email = get("contact_email");
  const primary_genre = get("primary_genre");
  const primary_link = get("primary_link");
  const launch_timing_raw = get("launch_timing");
  const goals_note = get("goals_note");

  // Required-field validation. The form has client-side `required`
  // attributes; this is the server-side guard for users with JS off
  // or custom clients.
  if (
    !display_name ||
    !contact_name ||
    !contact_email ||
    !primary_genre ||
    !primary_link ||
    !launch_timing_raw
  ) {
    redirect("/for-artists/apply?error=missing-required");
  }

  const launch_label =
    LAUNCH_TIMING_LABELS[launch_timing_raw ?? ""] ?? launch_timing_raw;

  const admin = createAdminClient();
  const { error } = await admin.from("applications").insert({
    display_name,
    contact_name,
    contact_email,
    genres: primary_genre ? [primary_genre] : null,
    social: primary_link
      ? [{ label: "Primary", href: primary_link }]
      : [],
    expected_launch_date: launch_label,
    community_pitch: goals_note,
    // Legacy columns left null on purpose — the post-acceptance
    // onboarding wizard fills them in. Listing them here keeps
    // the database insert explicit and easy to audit.
    slug_suggestion: null,
    tagline: null,
    bio: null,
    hero_image: null,
    contact_phone: null,
    manager_name: null,
    manager_email: null,
    distribution: null,
    monthly_listeners: null,
    upcoming_tour: null,
    founder_tier_interest: false,
    referral_source: null,
  });

  if (error) {
    console.error("submitArtistApplicationAction error:", error);
    redirect("/for-artists/apply?error=submit-failed");
  }

  redirect("/for-artists/apply/thanks");
}
