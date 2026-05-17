"use client";

import { useState, useTransition } from "react";
import {
  approveApplicationAction,
  rejectApplicationAction,
} from "./review-actions";

/**
 * ApplicationActions — Approve / Reject UI for a single pending row.
 *
 * Renders inline on each row in the admin applications queue. For
 * approved/rejected rows, the parent should NOT mount this component
 * (the queue can show the reviewer + decision instead).
 *
 * UX:
 *   - Approve opens a small expander with a slug confirmation field
 *     (defaults to the applicant's slug_suggestion) + optional notes.
 *   - Reject opens the same expander with notes only.
 *   - Submit fires the appropriate server action; result inline.
 */

interface ApplicationActionsProps {
  applicationId: string;
  defaultSlug: string;
  displayName: string;
}

type Mode = "idle" | "approving" | "rejecting";

export default function ApplicationActions({
  applicationId,
  defaultSlug,
  displayName,
}: ApplicationActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [slug, setSlug] = useState(defaultSlug);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode("idle");
    setError(null);
    setNotes("");
  }

  async function submitApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.append("application_id", applicationId);
    fd.append("approved_slug", slug.trim());
    fd.append("review_notes", notes.trim());
    startTransition(async () => {
      const res = await approveApplicationAction(fd);
      if (res.ok) setResult("approved");
      else setError(res.error ?? "unknown_error");
    });
  }

  async function submitReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.append("application_id", applicationId);
    fd.append("review_notes", notes.trim());
    startTransition(async () => {
      const res = await rejectApplicationAction(fd);
      if (res.ok) setResult("rejected");
      else setError(res.error ?? "unknown_error");
    });
  }

  if (result === "approved") {
    return (
      <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200">
        ✓ Approved — Slack + invite email fired.
      </p>
    );
  }
  if (result === "rejected") {
    return (
      <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
        ✓ Rejected — Slack notified.
      </p>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("approving")}
          className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setMode("rejecting")}
          className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
        >
          Reject
        </button>
      </div>
    );
  }

  if (mode === "approving") {
    return (
      <form
        onSubmit={submitApprove}
        className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 space-y-2"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Approve {displayName}
        </p>
        <div>
          <label className="block text-xs uppercase tracking-wide text-white/55">
            Approved slug (kebab-case, becomes /artists/&lt;slug&gt;)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9-]+"
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-white/55">
            Notes (optional — included in Slack + invite email)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
            placeholder="e.g., Co-managed by ABC Mgmt — loop them on onboarding."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending || !slug.trim()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Approving…" : "Confirm approve"}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-white/55 hover:text-white"
          >
            Cancel
          </button>
          {error && (
            <span className="text-xs text-rose-300">⚠ {error}</span>
          )}
        </div>
      </form>
    );
  }

  // mode === "rejecting"
  return (
    <form
      onSubmit={submitReject}
      className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3 space-y-2"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-200">
        Reject {displayName}
      </p>
      <div>
        <label className="block text-xs uppercase tracking-wide text-white/55">
          Reason (optional — Slack-internal, not sent to applicant)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
          placeholder="e.g., No active touring or recent releases."
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-rose-400 px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Rejecting…" : "Confirm reject"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-white/55 hover:text-white"
        >
          Cancel
        </button>
        {error && (
          <span className="text-xs text-rose-300">⚠ {error}</span>
        )}
      </div>
    </form>
  );
}
