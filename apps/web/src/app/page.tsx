"use client";

import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { GooeyOrbs } from "@/components/gooey-orbs";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { status, user, logout } = useAuth();

  if (status === "authenticated" && user) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="mb-2 flex w-full max-w-2xl justify-end">
          <button
            onClick={() => void logout()}
            className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Sign out
          </button>
        </div>
        <Dashboard />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-2 text-center">
        <div className="flex justify-center pb-1">
          <GooeyOrbs />
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
