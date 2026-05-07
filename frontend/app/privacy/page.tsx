import type { Metadata } from "next";
import PolicyPage from "@/app/(legal)/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Fan Engage",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <PolicyPage slug="privacy" />;
}
