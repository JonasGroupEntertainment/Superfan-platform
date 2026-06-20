import Link from "next/link";
import type { StampCardData } from "@/lib/data/stamp-card";

export default function StampCard({
  data,
  artistSlug,
  accentFrom = "#7c3aed",
  accentTo = "#f97316",
}: {
  data: StampCardData;
  artistSlug: string;
  accentFrom?: string;
  accentTo?: string;
}) {
  const stamps = Array.from({ length: data.stampsRequired }, (_, i) => i < data.stampsEarned);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Stamp Card</p>
          <p className="mt-0.5 text-xs text-white/50">
            {data.stampsEarned} / {data.stampsRequired} check-ins
          </p>
        </div>
        {data.rewardReady && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
          >
            Reward ready! 🎉
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {stamps.map((filled, i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-sm transition-all"
            style={
              filled
                ? { background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`, borderColor: "transparent" }
                : { borderColor: "rgba(255,255,255,0.15)", background: "transparent" }
            }
          >
            {filled ? "✓" : ""}
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-white/80">{data.rewardTitle}</p>
        {data.rewardDescription && (
          <p className="mt-0.5 text-xs text-white/50">{data.rewardDescription}</p>
        )}
      </div>

      {!data.rewardReady && (
        <Link
          href={`/artists/${artistSlug}/checkin`}
          className="inline-block rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 hover:bg-white/5 transition"
        >
          Check in to earn a stamp →
        </Link>
      )}
    </div>
  );
}
