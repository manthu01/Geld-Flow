"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { Reveal } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { LEDGER_TYPE_LABELS } from "@/lib/activity";
import { getInviteInfo, redeemInvite, type InviteInfo } from "@/lib/api";
import { PENDING_INVITE_KEY } from "@/lib/claim";

export default function InvitePage() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInviteInfo(token)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This invite link didn't work.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSignIn = useCallback(() => {
    window.localStorage.setItem(PENDING_INVITE_KEY, token);
    router.push("/login");
  }, [token, router]);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const result = await redeemInvite(authFetch, token);
      router.push(`/ledgers/${result.ledgerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join this group.");
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <Reveal className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-14 w-14 rounded-2xl" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Join a group
          </h1>
        </div>

        <GlassCard className="space-y-4 p-6 text-sm">
          {error && !info ? (
            <p className="text-owes">{error}</p>
          ) : !info ? (
            <p className="text-ink-soft">Loading…</p>
          ) : (
            <>
              <p className="text-ink">
                {info.createdByName} invited you to{" "}
                <span className="font-medium">
                  {info.ledgerName ?? LEDGER_TYPE_LABELS[info.ledgerType]}
                </span>
                . Join to start splitting expenses together.
              </p>

              {error && <p className="text-owes">{error}</p>}

              {status === "authenticated" ? (
                <button
                  onClick={handleJoin}
                  disabled={busy}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
                >
                  {busy ? "Joining…" : "Join group"}
                </button>
              ) : status === "loading" ? (
                <p className="text-ink-soft">Checking your session…</p>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95"
                >
                  Sign in to join
                </button>
              )}
            </>
          )}
        </GlassCard>
      </Reveal>
    </main>
  );
}
