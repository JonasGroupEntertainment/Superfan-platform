import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sourceIcon(source: string): string {
  switch (source) {
    case "challenge":   return "🏆";
    case "referral":    return "🤝";
    case "redemption":  return "🎁";
    case "admin":       return "⚙️";
    case "campaign":    return "📣";
    case "event":       return "🎤";
    case "badge":       return "🏅";
    default:            return "⭐";
  }
}

interface LedgerRow {
  id: string;
  delta: number;
  source: string;
  note: string | null;
  created_at: string;
  community_id: string;
  community_display_name: string | null;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Sum points across all community memberships — the authoritative source
  // post-4a; fans.total_points is legacy and may lag behind.
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("fan_community_memberships")
    .select("total_points")
    .eq("fan_id", user.id);
  const fan = { total_points: (memberships ?? []).reduce((s, m) => s + ((m.total_points as number) ?? 0), 0) };

  // Fetch paginated ledger rows joined to communities for display_name
  const { data: rows, count } = await supabase
    .from("points_ledger")
    .select(
      `id, delta, source, note, created_at, community_id,
       communities:community_id ( display_name )`,
      { count: "exact" },
    )
    .eq("fan_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Normalise the Supabase join shape
  const entries: LedgerRow[] = (rows ?? []).map((r) => {
    const raw = r.communities;
    const comm =
      raw && !Array.isArray(raw)
        ? (raw as unknown as { display_name: string })
        : Array.isArray(raw) && raw.length > 0
          ? (raw[0] as { display_name: string })
          : null;
    return {
      id: r.id as string,
      delta: r.delta as number,
      source: r.source as string,
      note: r.note as string | null,
      created_at: r.created_at as string,
      community_id: r.community_id as string,
      community_display_name: comm?.display_name ?? null,
    };
  });

  const totalPoints = fan?.total_points ?? 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.25em] text-white/55 hover:text-white transition"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Activity log</h1>
        <p className="mt-1 text-sm text-white/55">
          Every point you&apos;ve earned, in order.
        </p>
      </header>

      {/* Total points banner */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-white/5 to-amber-500/10 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">Total points</p>
          <p className="mt-1 text-4xl font-bold text-white">
            {totalPoints.toLocaleString()}
          </p>
        </div>
        <div className="text-5xl opacity-60">⭐</div>
      </div>

      {/* Log */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-base font-semibold text-white">No activity yet</p>
          <p className="mt-2 text-sm text-white/55">
            Earn your first points by engaging with an artist&apos;s community —
            comment, react, RSVP to an event, or complete a challenge.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            Explore artists
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <ul className="divide-y divide-white/5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 px-5 py-4 hover:bg-white/5 transition"
              >
                {/* Icon */}
                <span className="mt-0.5 text-xl leading-none select-none">
                  {sourceIcon(entry.source)}
                </span>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white leading-snug">
                    {entry.note ?? entry.source}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {entry.community_display_name ?? entry.community_id}
                    {" · "}
                    {timeAgo(entry.created_at)}
                  </p>
                </div>

                {/* Delta */}
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    entry.delta >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta.toLocaleString()} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm text-white/55">
          {page > 1 ? (
            <Link
              href={`/activity?page=${page - 1}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 hover:text-white transition"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-xs">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/activity?page=${page + 1}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 hover:text-white transition"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* Footer count */}
      {entries.length > 0 && (
        <p className="mt-4 text-center text-xs text-white/35">
          {totalCount.toLocaleString()} event{totalCount === 1 ? "" : "s"} total
        </p>
      )}
    </div>
  );
}
