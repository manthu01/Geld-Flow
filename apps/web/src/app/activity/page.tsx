"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { describeActivity, LEDGER_TYPE_LABELS } from "@/lib/activity";
import {
  getAnalysisSummary,
  type ActivityEventView,
  type LedgerBrief,
} from "@/lib/api";

interface FeedEntry {
  event: ActivityEventView;
  ledger: LedgerBrief;
}

interface LedgerStat {
  ledger: LedgerBrief;
  expenseCount: number;
}

export default function ActivityPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [stats, setStats] = useState<LedgerStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Cross-ledger, but never sums money across ledgers — a group debt and a
  // personal debt between the same two people must never mix. This page
  // only merges activity as a read-only log and counts expenses per
  // ledger; every dollar figure the app shows elsewhere stays scoped to
  // its own ledger. The merge itself happens server-side now (one request
  // regardless of how many ledgers you're in, instead of 1 + 2 per ledger).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { stats, feed } = await getAnalysisSummary(authFetch);
      setStats(stats);
      setFeed(feed);
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

  if (status !== "authenticated") return null;

  return (
    <AppShell>
      <div className="w-full max-w-5xl space-y-8">
        <Reveal className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-ink-soft">
            A combined activity log across every ledger you&rsquo;re in. Balances still never mix
            between ledgers — this is just a timeline.
          </p>
        </Reveal>

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-display text-lg font-medium">Activity per ledger</h2>
              {stats.length === 0 ? (
                <EmptyState title="No ledgers yet" hint="Start a group or personal ledger to see activity here." />
              ) : (
                <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.map((s) => (
                    <StaggerItem key={s.ledger.id}>
                      <GlassCard className="p-4">
                        <p className="truncate font-medium text-ink">
                          {s.ledger.name ?? LEDGER_TYPE_LABELS[s.ledger.type]}
                        </p>
                        <p className="mt-1 font-mono text-xs text-ink-soft">
                          {s.expenseCount} expense{s.expenseCount === 1 ? "" : "s"} logged
                        </p>
                      </GlassCard>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-medium">Recent activity</h2>
              {feed.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <GlassCard className="p-0">
                  <StaggerGroup className="divide-y divide-surface-border">
                    {feed.map(({ event, ledger }) => (
                      <StaggerItem
                        key={event.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink-soft"
                      >
                        <span>{describeActivity(event)}</span>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-soft/70">
                          {ledger.name ?? LEDGER_TYPE_LABELS[ledger.type]}
                        </span>
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </GlassCard>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
