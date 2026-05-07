"use client";

/**
 * Wraps a grid of upcoming-event cards. When the total exceeds the
 * threshold (default 5), only the first N render and a "Show all X
 * events" button toggles to reveal the rest. Used on /artists/[slug]
 * so RaeLynn's 18 tour dates don't drown out the rest of the hub.
 *
 * Receives the rendered event cards as children — the parent server
 * component does the per-event rendering (paywall checks, RsvpButton,
 * date formatting) and we only own the show-more interaction.
 */

import { Children, useState } from "react";

export function ExpandableEventGrid({
  children,
  threshold = 5,
}: {
  children: React.ReactNode;
  threshold?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const arr = Children.toArray(children);
  const total = arr.length;

  // Below threshold — no toggle, render the full grid like the
  // pre-refactor markup.
  if (total <= threshold) {
    return <div className="mt-4 grid gap-4 md:grid-cols-2">{arr}</div>;
  }

  const visible = showAll ? arr : arr.slice(0, threshold);

  return (
    <>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible}</div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-white/50">
          {showAll
            ? `Showing all ${total} events`
            : `Showing ${threshold} of ${total} events`}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white/80 transition hover:bg-white/10"
        >
          {showAll ? "Show fewer ↑" : `Show all ${total} events ↓`}
        </button>
      </div>
    </>
  );
}
