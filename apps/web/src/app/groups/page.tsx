"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { LedgerCard } from "@/components/ledger-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { createGroupLedger, listMyLedgers, type LedgerSummary } from "@/lib/api";

export default function GroupsPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyLedgers(authFetch);
      setGroups(data.groups);
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
      const ledger = await createGroupLedger(authFetch, {
        type: String(form.get("type")) as "group_general" | "group_travel" | "group_event",
        name: String(form.get("name") || "") || undefined,
        baseCurrency: String(form.get("currency") || "USD"),
      });
      router.push(`/ledgers/${ledger.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the group.");
      setBusy(false);
    }
  }

  if (status !== "authenticated") return null;

  return (
    <AppShell>
      <div className="w-full max-w-6xl space-y-6">
        <Reveal className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Groups</h1>
            <p className="text-sm text-ink-soft">Trips, events, and shared tabs with everyone in.</p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
          >
            New group
          </button>
        </Reveal>

        {showNew && (
          <GlassCard className="space-y-3 p-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  name="name"
                  placeholder="Group name (e.g. Iceland trip)"
                  className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <select
                  name="type"
                  defaultValue="group_general"
                  className="rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="group_general">General</option>
                  <option value="group_travel">Travel</option>
                  <option value="group_event">Event</option>
                </select>
              </div>
              <input type="hidden" name="currency" value="USD" />
              {formError && <p className="text-sm text-owes">{formError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95 disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create group"}
              </button>
            </form>
          </GlassCard>
        )}

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : groups.length === 0 ? (
          <EmptyState title="No group ledgers yet" hint="Start a trip, event, or tab above." />
        ) : (
          <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((g) => (
              <StaggerItem key={g.id}>
                <LedgerCard ledger={g} subtitle="Group" />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </AppShell>
  );
}
