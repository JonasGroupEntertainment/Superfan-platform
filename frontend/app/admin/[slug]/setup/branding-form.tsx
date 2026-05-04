"use client";

import { useState, useTransition } from "react";
import { updateBrandingAction } from "./setup-actions";

interface Props {
  slug: string;
  accentFrom: string;
  accentTo: string;
}

export default function BrandingForm({ slug, accentFrom, accentTo }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" | "ok" | "err"; msg?: string }
  >({ kind: "idle" });
  const [from, setFrom] = useState(accentFrom);
  const [to, setTo] = useState(accentTo);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const r = await updateBrandingAction(fd);
      setStatus(
        r.ok
          ? { kind: "ok", msg: r.message ?? "Saved" }
          : { kind: "err", msg: r.error ?? "Failed to save" },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="accent_from"
            className="block text-xs font-medium uppercase tracking-wider text-white/55"
          >
            Gradient start
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="accent_from_picker"
              type="color"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-white/15 bg-black/30"
              aria-label="Pick gradient start color"
            />
            <input
              id="accent_from"
              name="accent_from"
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              placeholder="#7C3AED"
              className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono focus:border-aurora focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="accent_to"
            className="block text-xs font-medium uppercase tracking-wider text-white/55"
          >
            Gradient end
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="accent_to_picker"
              type="color"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-white/15 bg-black/30"
              aria-label="Pick gradient end color"
            />
            <input
              id="accent_to"
              name="accent_to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              placeholder="#EC4899"
              className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono focus:border-aurora focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-white/55">Preview</p>
        <div
          className="mt-2 h-14 w-full rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${from}, ${to})`,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-aurora px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save branding"}
        </button>
        {status.kind === "ok" && (
          <span className="text-xs text-emerald-300">{status.msg}</span>
        )}
        {status.kind === "err" && (
          <span className="text-xs text-rose-300">{status.msg}</span>
        )}
      </div>
    </form>
  );
}
