"use client";

import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

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
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="animate-fade-in-up w-full max-w-md space-y-4 text-center">
        <div className="flex justify-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
          <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-16 w-16 rounded-2xl" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          Geld Flow
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Split expenses, not friendships.
        </h1>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
