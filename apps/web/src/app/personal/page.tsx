"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { LedgerCard } from "@/components/ledger-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { getOrCreatePersonalLedger, listMyLedgers, type LedgerSummary } from "@/lib/api";

export default function PersonalPage() {
  const { status, user, authFetch } = useAuth();
  const router = useRouter();

  const [personal, setPersonal] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyLedgers(authFetch);
      setPersonal(data.personal);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [status, router, load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError(null);
    try {
      const ledger = await getOrCreatePersonalLedger(authFetch, {
        peerEmail: String(form.get("peerEmail") || ""),
        baseCurrency: String(form.get("currency") || "USD"),
      });
      router.push(`/ledgers/${ledger.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not open that personal ledger.");
      setBusy(false);
    }
  }

  if (status !== "authenticated") return null;

  return (
    <AppShell>
      <div className="w-full max-w-6xl space-y-6">
        <Reveal className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Personal</h1>
            <p className="text-sm text-ink-soft">One-on-one splits between you and a friend.</p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
          >
            New personal ledger
          </button>
        </Reveal>

        {showNew && (
          <GlassCard className="space-y-3 p-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                name="peerEmail"
                type="email"
                required
                placeholder="Their email address"
                className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input type="hidden" name="currency" value="USD" />
              {formError && <p className="text-sm text-owes">{formError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95 disabled:opacity-60"
              >
                {busy ? "Opening…" : "Open personal ledger"}
              </button>
            </form>
          </GlassCard>
        )}

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : personal.length === 0 ? (
          <EmptyState title="No personal ledgers yet" hint="Open one with a friend's email above." />
        ) : (
          <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {personal.map((p) => {
              const peer = p.members.find((m) => m.userId !== user?.id);
              return (
                <StaggerItem key={p.id}>
                  <LedgerCard ledger={p} subtitle={peer?.user.name ?? "Personal ledger"} />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </div>
    </AppShell>
  );
}
