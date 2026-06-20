"use client";

import { useState, useRef } from "react";
import { sendBroadcast, type BroadcastFormResult } from "./actions";

const TIERS = ["all", "bronze", "silver", "gold", "platinum"] as const;
const CHANNELS = ["sms", "email", "both"] as const;

export default function BroadcastPage() {
  const [tier, setTier] = useState<(typeof TIERS)[number]>("all");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("sms");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<BroadcastFormResult | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirmed) return;
    setPending(true);
    setResult(null);
    const data = new FormData(e.currentTarget);
    const res = await sendBroadcast(data);
    setResult(res);
    setPending(false);
    if (res.ok) {
      setConfirmed(false);
      formRef.current?.reset();
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Broadcast
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Send a targeted message to fans via SMS, email, or both.
        </p>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Artist slug — hidden, pulled from admin context server-side */}
        <input type="hidden" name="artist_slug" value="raelynn" />

        {/* Tier filter */}
        <div>
          <p className="mb-2 text-sm font-medium">Fan tier</p>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <label key={t} className="cursor-pointer">
                <input
                  type="radio"
                  name="tier_filter"
                  value={t}
                  checked={tier === t}
                  onChange={() => setTier(t)}
                  className="sr-only"
                />
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                    tier === t
                      ? "bg-aurora text-white"
                      : "border border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {t === "all" ? "All fans" : `${t}+`}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Channel */}
        <div>
          <p className="mb-2 text-sm font-medium">Channel</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  value={c}
                  checked={channel === c}
                  onChange={() => setChannel(c)}
                  className="sr-only"
                />
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                    channel === c
                      ? "bg-aurora text-white"
                      : "border border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {c === "both" ? "SMS + Email" : c.toUpperCase()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="broadcast-msg">
            Message
          </label>
          <MessageTextarea channel={channel} />
        </div>

        {/* Confirm */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-aurora"
          />
          <span className="text-sm text-white/70">
            I confirm I want to send this broadcast to opted-in fans.
          </span>
        </label>

        <button
          type="submit"
          disabled={!confirmed || pending}
          className="w-full rounded-full bg-gradient-to-r from-aurora to-ember py-3 text-sm font-semibold text-white disabled:opacity-40 transition"
        >
          {pending ? "Sending…" : "Send broadcast"}
        </button>

        {result && (
          <div
            className={`rounded-xl p-4 text-sm ${result.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}
          >
            {result.ok ? (
              <>
                ✓ Sent — {result.smsSent ?? 0} SMS · {result.emailSent ?? 0} email
              </>
            ) : (
              <>✗ {result.error}</>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function MessageTextarea({ channel }: { channel: string }) {
  const [len, setLen] = useState(0);
  const showCounter = channel === "sms" || channel === "both";

  return (
    <div className="relative">
      <textarea
        id="broadcast-msg"
        name="message"
        rows={4}
        maxLength={showCounter ? 160 : undefined}
        onChange={(e) => setLen(e.target.value.length)}
        placeholder="Write your message…"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-aurora focus:outline-none resize-none"
      />
      {showCounter && (
        <span className="absolute bottom-2 right-3 text-xs text-white/30">
          {len}/160
        </span>
      )}
    </div>
  );
}
