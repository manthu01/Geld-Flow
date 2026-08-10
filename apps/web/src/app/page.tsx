"use client";

import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { status, user, logout } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {status === "authenticated" ? "Signed in" : "Phase 1 — auth"}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Geld Flow
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
          {status === "authenticated" && user && (
            <p className="text-sm text-ink-soft">
              Welcome back, <span className="font-medium text-ink">{user.name}</span>.{" "}
              <button
                onClick={() => void logout()}
                className="text-accent-strong underline underline-offset-2"
              >
                Sign out
              </button>
            </p>
          )}
        </div>

        <GlassCard className="p-5 space-y-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Weekend trip</span>
            <span className="font-mono text-xs text-ink-soft">Group</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm">You&rsquo;re owed</span>
            <span className="font-mono text-2xl font-medium text-owed">
              $128.40
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm">You owe</span>
            <span className="font-mono text-2xl font-medium text-owes">
              $42.00
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <p className="text-sm text-ink-soft">
            Sample data — ledger creation and real balances start in Phase
            1&rsquo;s next slice.
          </p>
        </GlassCard>
      </div>
    </main>
  );
}
