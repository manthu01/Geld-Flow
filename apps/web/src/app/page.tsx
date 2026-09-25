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

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-2 text-center">
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
        {status === "loading" && (
          <p className="text-sm text-ink-soft">Checking your session…</p>
        )}
        {status === "unauthenticated" && (
          <p className="text-sm text-ink-soft">
            <Link href="/login" className="text-accent-strong underline underline-offset-2">
              Sign in
            </Link>{" "}
            to see your ledgers.
          </p>
        )}
      </div>
    </main>
  );
}
