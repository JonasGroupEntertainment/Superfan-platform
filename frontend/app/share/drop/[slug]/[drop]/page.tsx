import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { getArtistFromDb } from "@/lib/data/artists";
import ShareButton from "@/components/share-button";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; drop: string }>;
}): Promise<Metadata> {
  const { slug, drop } = await params;
  const artist = await getArtistFromDb(slug).catch(() => null);
  const artistName = artist?.name ?? "Fan Engage";
  const dropLabel = decodeURIComponent(drop)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `Exclusive Drop: ${dropLabel} — ${artistName}`;
  const description = `Premium fans got first access to ${dropLabel} from ${artistName} on Fan Engage.`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/share/drop/${slug}/${drop}`,
      siteName: "Fan Engage",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DropSharePage({
  params,
}: {
  params: Promise<{ slug: string; drop: string }>;
}) {
  const { slug, drop } = await params;
  const artist = await getArtistFromDb(slug).catch(() => null);
  if (!artist) notFound();

  const dropLabel = decodeURIComponent(drop)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const shareUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string"
      ? `${process.env.NEXT_PUBLIC_APP_URL}/share/drop/${slug}/${drop}`
      : `https://fan-engage-pearl.vercel.app/share/drop/${slug}/${drop}`;
  const shareTitle = `I got early access to ${dropLabel} from ${artist.name}`;
  const shareText = `Premium fans on Fan Engage got first access. Don't miss the next one: ${shareUrl}`;

  return (
    <main className="min-h-screen bg-[#050b1f] text-white flex flex-col items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-lg rounded-2xl border border-white/20 p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background:
            `radial-gradient(circle at 20% 15%, ${artist.accentFrom}66, transparent 55%), ` +
            `radial-gradient(circle at 80% 85%, ${artist.accentTo}66, transparent 60%), ` +
            "rgba(255,255,255,0.03)",
          boxShadow: `0 0 60px ${artist.accentFrom}22`,
        }}
      >
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-medium">Fan Engage</p>
        <div className="text-7xl leading-none">🎁</div>
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-widest uppercase text-white/50">Exclusive Drop</p>
          <h1
            className="text-3xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${artist.accentFrom}, ${artist.accentTo})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {dropLabel}
          </h1>
          <p className="text-white/60 text-sm">from {artist.name}</p>
        </div>
        <p className="text-white/60 text-sm max-w-xs">
          Premium fans on Fan Engage get first access to exclusive drops. Don&apos;t miss the next one.
        </p>
        <ShareButton
          title={shareTitle}
          text={shareText}
          url={shareUrl}
          label="Share this"
          variant="primary"
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href={`/artists/${artist.slug}`}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Visit fan experience →
        </Link>
        <p className="text-xs text-white/30 max-w-xs text-center">
          Unlock Premium to get first access to {artist.name}&apos;s drops on Fan Engage.
        </p>
      </div>
    </main>
  );
}
