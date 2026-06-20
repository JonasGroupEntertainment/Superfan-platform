"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type State = "loading" | "success" | "already" | "error" | "unauthenticated";

export default function CheckinPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [points, setPoints] = useState(0);

  useEffect(() => {
    async function doCheckin() {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_slug: slug }),
      });
      if (res.status === 401) { setState("unauthenticated"); return; }
      if (!res.ok) { setState("error"); return; }
      const data = await res.json();
      if (data.alreadyCheckedIn) {
        setState("already");
      } else {
        setPoints(data.pointsAwarded);
        setState("success");
      }
    }
    doCheckin();
  }, [slug]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {state === "loading" && (
        <p className="text-white/60 animate-pulse">Checking you in…</p>
      )}

      {state === "success" && (
        <div className="space-y-4">
          <p className="text-5xl">✅</p>
          <h1 className="text-2xl font-semibold">Checked in!</h1>
          <p className="text-white/60">+{points} points added to your account.</p>
          <button
            onClick={() => router.push(`/artists/${slug}`)}
            className="mt-4 rounded-full bg-gradient-to-r from-aurora to-ember px-6 py-3 text-sm font-semibold"
          >
            Back to artist page
          </button>
        </div>
      )}

      {state === "already" && (
        <div className="space-y-4">
          <p className="text-5xl">👋</p>
          <h1 className="text-2xl font-semibold">Already checked in today</h1>
          <p className="text-white/60">Come back tomorrow for more points.</p>
          <button
            onClick={() => router.push(`/artists/${slug}`)}
            className="mt-4 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 hover:bg-white/5"
          >
            Back to artist page
          </button>
        </div>
      )}

      {state === "unauthenticated" && (
        <div className="space-y-4">
          <p className="text-5xl">🔒</p>
          <h1 className="text-2xl font-semibold">Sign in to check in</h1>
          <button
            onClick={() => router.push(`/login?next=/artists/${slug}/checkin`)}
            className="mt-4 rounded-full bg-gradient-to-r from-aurora to-ember px-6 py-3 text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-4">
          <p className="text-5xl">⚠️</p>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-white/60">Please try again or visit the artist page.</p>
          <button
            onClick={() => router.push(`/artists/${slug}`)}
            className="mt-4 rounded-full border border-white/20 px-6 py-3 text-sm font-medium"
          >
            Back to artist page
          </button>
        </div>
      )}
    </main>
  );
}
