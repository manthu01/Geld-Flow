"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeCase } from "@/components/badge-case";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { LedgerCard } from "@/components/ledger-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import {
  createGroupLedger,
  getMyScore,
  getOrCreatePersonalLedger,
  listMyLedgers,
  redeemInvite,
  type LedgerSummary,
  type ScoreView,
} from "@/lib/api";

function extractInviteToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/invites\/([^/]+)\/redeem/);
  return match ? match[1] : trimmed;
}

export function Dashboard() {
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<LedgerSummary[]>([]);
  const [personal, setPersonal] = useState<LedgerSummary[]>([]);
  const [score, setScore] = useState<ScoreView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, scoreData] = await Promise.all([
        listMyLedgers(authFetch),
        getMyScore(authFetch),
      ]);
      setGroups(data.groups);
      setPersonal(data.personal);
      setScore(scoreData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your ledgers.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // Data fetch on mount, not a render-loop synchronization — the rule's
    // false-positive case for this pattern (see auth-context.tsx history).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
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

  async function handlePersonal(event: FormEvent<HTMLFormElement>) {
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

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError(null);
    try {
      const token = extractInviteToken(String(form.get("invite") || ""));
      const result = await redeemInvite(authFetch, token);
      router.push(`/ledgers/${result.ledgerId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "That invite link didn't work.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-8">
      <Reveal className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        {score && (
          <p className="font-mono text-xs text-ink-soft">
            Rank {score.currentRank} · {score.confirmedSettlements} settlement
            {score.confirmedSettlements === 1 ? "" : "s"} confirmed
          </p>
        )}
      </Reveal>

      <Reveal delay={0.05}>
        <BadgeCase />
      </Reveal>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setShowNewGroup((v) => !v);
            setShowPersonal(false);
            setShowJoin(false);
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95"
        >
          New group
        </button>
        <button
          onClick={() => {
            setShowPersonal((v) => !v);
            setShowNewGroup(false);
            setShowJoin(false);
          }}
          className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-surface-strong active:scale-95"
        >
          Start a personal ledger
        </button>
        <button
          onClick={() => {
            setShowJoin((v) => !v);
            setShowNewGroup(false);
            setShowPersonal(false);
          }}
          className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-surface-strong active:scale-95"
        >
          Join with invite
        </button>
      </div>

      {showNewGroup && (
        <GlassCard className="space-y-3 p-5">
          <form onSubmit={handleCreateGroup} className="space-y-3">
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create group"}
            </button>
          </form>
        </GlassCard>
      )}

      {showPersonal && (
        <GlassCard className="space-y-3 p-5">
          <form onSubmit={handlePersonal} className="space-y-3">
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Open personal ledger"}
            </button>
          </form>
        </GlassCard>
      )}

      {showJoin && (
        <GlassCard className="space-y-3 p-5">
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              name="invite"
              required
              placeholder="Paste an invite link"
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {formError && <p className="text-sm text-owes">{formError}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
            >
              {busy ? "Joining…" : "Join"}
            </button>
          </form>
        </GlassCard>
      )}

      {loading && <p className="text-sm text-ink-soft">Loading your ledgers…</p>}
      {error && <p className="text-sm text-owes">{error}</p>}

      {!loading && !error && (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium">Groups</h2>
            {groups.length === 0 ? (
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
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium">Personal</h2>
            {personal.length === 0 ? (
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
          </section>
        </>
      )}
    </div>
  );
}
