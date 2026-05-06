import ApplyForm from "./apply-form";

export const metadata = {
  title: "Apply as an Artist · Fan Engage",
  description:
    "Apply to launch an artist fan club on Fan Engage. Tell us about your music, fanbase, and launch goals — we respond within 48 hours.",
  alternates: { canonical: "/for-artists/apply" },
  openGraph: {
    type: "website",
    url: "/for-artists/apply",
    siteName: "Fan Engage",
    title: "Apply to launch your fan club · Fan Engage",
    description:
      "Tell us about your music and your fans. No payment or contract required to apply — we respond within 48 hours.",
  },
};

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          For Artists · Apply
        </p>
        <h1
          className="text-4xl font-semibold leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tell us about your music
        </h1>
        <p className="text-sm text-white/70">
          We review applications within 48 hours. Required fields are marked.
        </p>
      </header>
      <ApplyForm />
    </main>
  );
}
