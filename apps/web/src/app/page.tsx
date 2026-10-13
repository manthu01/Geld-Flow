"use client";

import dynamic from "next/dynamic";
import { Dashboard } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

// Dynamically imported (and client-only) so the motion-driven marketing
// experience — framer-motion, the scroll-linked debt-network visual —
// never ships in the bundle for the common case: someone who's actually
// signed in and landing straight on their Dashboard.
const MarketingPage = dynamic(
  () => import("@/components/landing/marketing-page").then((m) => m.MarketingPage),
  { ssr: false },
);

export default function Home() {
  const { status, user } = useAuth();

  if (status === "authenticated" && user) {
    return (
      <AppShell>
        <Dashboard />
      </AppShell>
    );
  }

  // Render the signed-out view immediately for "loading" too — the session
  // check happens in the background, and there's nothing worth blocking on
  // here. Whoever's actually logged in gets swapped to the dashboard the
  // moment that resolves; everyone else was never made to wait on a
  // "checking session" message just to see a sign-in prompt.
  return <MarketingPage />;
}
