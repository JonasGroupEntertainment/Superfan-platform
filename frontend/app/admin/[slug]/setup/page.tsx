import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  initializeCommunityFormAction,
  markSetupCompleteFormAction,
} from "./setup-actions";
import ProfileForm from "./profile-form";
import BrandingForm from "./branding-form";
import SocialForm from "./social-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Setup · Admin · Fan Engage" };

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ArtistRow {
  slug: string;
  name: string | null;
  tagline: string | null;
  bio: string | null;
  hero_image: string | null;
  accent_from: string | null;
  accent_to: string | null;
  social: { label: string; href: string }[] | null;
}

interface CommunityRow {
  slug: string;
  display_name: string | null;
  active: boolean | null;
}

interface ApplicationRow {
  display_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  approved_slug: string | null;
}

export default async function SetupPage({ params }: PageProps) {
  const { slug } = await params;

  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const admin = createAdminClient();

  const [{ data: artist }, { data: community }, { data: app }, rewardsRes, postsRes] =
    await Promise.all([
      admin
        .from("artists")
        .select(
          "slug, name, tagline, bio, hero_image, accent_from, accent_to, social",
        )
        .eq("slug", slug)
        .maybeSingle<ArtistRow>(),
      admin
        .from("communities")
        .select("slug, display_name, active")
        .eq("slug", slug)
        .maybeSingle<CommunityRow>(),
      admin
        .from("applications")
        .select("display_name, contact_name, contact_email, approved_slug")
        .eq("approved_slug", slug)
        .maybeSingle<ApplicationRow>(),
      admin
        .from("rewards_catalog")
        .select("id", { count: "exact", head: true })
        .eq("community_id", slug),
      admin
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("artist_slug", slug),
    ]);

  // If neither an artist row nor an application row exists, the slug
  // doesn't map to anything — bail out.
  if (!artist && !community && !app) {
    notFound();
  }

  const initialized = !!artist && !!community;
  const rewardsCount = rewardsRes.count ?? 0;
  const postsCount = postsRes.count ?? 0;

  const profileComplete = !!(artist?.tagline && artist?.bio);
  const socialComplete = (artist?.social?.length ?? 0) > 0;
  const brandingComplete = !!(artist?.accent_from && artist?.accent_to);

  const checklist = [
    { label: "Initialize community", done: initialized },
    { label: "Profile (tagline + bio)", done: profileComplete },
    { label: "Branding colors", done: brandingComplete },
    { label: "Social links", done: socialComplete },
    { label: "Rewards seeded", done: rewardsCount > 0 },
    { label: "Welcome post", done: postsCount > 0 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const totalCount = checklist.length;
  const live = !!community?.active;

  const headerName =
    artist?.name ?? community?.display_name ?? app?.display_name ?? slug;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-white/50">
          Setup wizard · {slug}
        </p>
        <h1
          className="text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Set up the {headerName} community
        </h1>
        <p className="text-sm text-white/65">
          Walk through each section to get the artist page live. You can come
          back to this page anytime — it&apos;s safe to leave between steps.
        </p>
      </header>

      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <p className="text-sm font-medium">
            Progress: {doneCount} of {totalCount} steps complete
          </p>
          <p className="mt-1 text-xs text-white/55">
            {live
              ? "Community is live — visible at /artists/" + slug
              : "Community is not yet live. Finish the steps below, then mark setup complete."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {checklist.map((c) => (
            <span
              key={c.label}
              className={`rounded-full px-3 py-1 ${
                c.done
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {c.done ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
      </div>

      {!initialized ? (
        <section className="glass-card space-y-4 rounded-2xl p-6">
          <div>
            <h2 className="text-xl font-semibold">Step 1 — Initialize</h2>
            <p className="mt-2 text-sm text-white/70">
              {app
                ? `We'll create the artist row, the community row, seed a default 4-reward catalog, and post a welcome announcement using info from ${app.contact_name ?? "the application"}'s submission.`
                : "We'll create the artist row, community row, default reward catalog, and welcome post using the slug. You'll fill in profile copy in the next step."}
            </p>
          </div>
          <form action={initializeCommunityFormAction}>
            <input type="hidden" name="slug" value={slug} />
            <button
              type="submit"
              className="rounded-lg bg-aurora px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Initialize community
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="glass-card space-y-4 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Profile copy</h2>
                <p className="mt-1 text-sm text-white/65">
                  Tagline shows under the artist name on the public page.
                  Bio appears in the &quot;About&quot; block below the hero.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  profileComplete
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {profileComplete ? "Complete" : "Needs copy"}
              </span>
            </div>
            <ProfileForm
              slug={slug}
              tagline={artist?.tagline ?? ""}
              bio={artist?.bio ?? ""}
            />
          </section>

          <section className="glass-card space-y-4 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Branding</h2>
                <p className="mt-1 text-sm text-white/65">
                  Accent gradient for buttons, badges, and the hero glow.
                  Defaults to FE purple/pink if you don&apos;t change them.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  brandingComplete
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {brandingComplete ? "Complete" : "Defaults"}
              </span>
            </div>
            <BrandingForm
              slug={slug}
              accentFrom={artist?.accent_from ?? "#7C3AED"}
              accentTo={artist?.accent_to ?? "#EC4899"}
            />
          </section>

          <section className="glass-card space-y-4 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Social links</h2>
                <p className="mt-1 text-sm text-white/65">
                  Handles only — we&apos;ll prepend the platform URL. For
                  Spotify, paste the full artist page URL.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  socialComplete
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {(artist?.social?.length ?? 0)} link
                {(artist?.social?.length ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
            <SocialForm slug={slug} social={artist?.social ?? []} />
          </section>

          <section className="glass-card space-y-4 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Rewards & welcome post</h2>
                <p className="mt-1 text-sm text-white/65">
                  Seeded automatically on initialize. Manage them at the
                  links below — this section is informational.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  rewardsCount > 0 && postsCount > 0
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {rewardsCount} rewards · {postsCount} posts
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                href={`/admin/${slug}/rewards`}
                className="rounded-lg border border-white/15 px-3 py-2 text-white/80 hover:bg-white/5"
              >
                Manage rewards →
              </Link>
              <Link
                href={`/admin/${slug}/posts`}
                className="rounded-lg border border-white/15 px-3 py-2 text-white/80 hover:bg-white/5"
              >
                Edit posts →
              </Link>
            </div>
          </section>

          <section className="glass-card space-y-4 rounded-2xl border border-aurora/40 p-6">
            <div>
              <h2 className="text-xl font-semibold">
                {live ? "Community is live" : "Mark setup complete"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {live
                  ? `Fans can already join at /artists/${slug}. You can keep editing the sections above — changes go live immediately.`
                  : `When you flip this on, the community appears in the public artists list and fans can start joining. You can edit any section afterwards.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {live ? (
                <Link
                  href={`/artists/${slug}`}
                  className="rounded-lg bg-aurora px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  View public page →
                </Link>
              ) : (
                <form action={markSetupCompleteFormAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="rounded-lg bg-aurora px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                    disabled={!profileComplete}
                  >
                    Mark setup complete & go live
                  </button>
                </form>
              )}
              {!live && !profileComplete && (
                <p className="text-xs text-amber-300">
                  Add a tagline + bio first so the public page isn&apos;t bare.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
