import type { ActivityPulse } from "@/lib/data/activity-pulse";

export default function ActivityPulseStrip({ pulse }: { pulse: ActivityPulse }) {
  const pills = [
    { label: "check-ins today", value: pulse.checkinsToday },
    { label: "RSVPs this week", value: pulse.rsvpsThisWeek },
    { label: "posts this week", value: pulse.postsThisWeek },
    { label: "new fans this week", value: pulse.newFollowersThisWeek },
  ].filter((p) => p.value > 0);

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {pills.map((p) => (
        <span
          key={p.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
        >
          <span className="font-semibold text-white">{p.value.toLocaleString()}</span>
          {p.label}
        </span>
      ))}
    </div>
  );
}
