"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { StaggerGroup, StaggerItem, Reveal } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { describeActivity, LEDGER_TYPE_LABELS } from "@/lib/activity";
import { getActivityFeed, type ActivityFeedEntry } from "@/lib/api";

const PAGE_SIZE = 20;

export default function ActivityPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<ActivityFeedEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cross-ledger, but never sums money across ledgers — a group debt and a
  // personal debt between the same two people must never mix. This is a
  // read-only timeline. Fetched 20 at a time — the database only ever
  // returns the page actually requested, never the whole history.
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActivityFeed(authFetch, 1, PAGE_SIZE);
      setEntries(result.items);
      setPage(1);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const result = await getActivityFeed(authFetch, nextPage, PAGE_SIZE);
      setEntries((prev) => [...prev, ...result.items]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more activity.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadFirstPage();
    }
  }, [status, router, loadFirstPage]);

  if (status !== "authenticated") return null;

  return (
    <AppShell>
      <div className="w-full max-w-3xl space-y-6">
        <Reveal className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-ink-soft">
            A combined log across every ledger you&rsquo;re in. Balances still never mix between
            ledgers — this is just a timeline.
          </p>
        </Reveal>

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <>
            <GlassCard className="p-0">
              <StaggerGroup className="divide-y divide-surface-border">
                {entries.map(({ event, ledger }) => (
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

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Show more"}
                </button>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-owes">{error}</p>}
      </div>
    </AppShell>
  );
}
