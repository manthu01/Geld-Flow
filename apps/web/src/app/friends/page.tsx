"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GlassCard } from "@/components/glass-card";
import { PersonalLedgerForm } from "@/components/personal-ledger-form";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { LEDGER_TYPE_LABELS } from "@/lib/activity";
import { convertForDisplay, formatMoney } from "@/lib/currency";
import { listFriends, type FriendRelationship } from "@/lib/api";

const BALANCE_EPSILON = 0.005;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function FriendRow({
  relationship,
  displayCurrency,
}: {
  relationship: FriendRelationship;
  displayCurrency: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { friend, breakdown } = relationship;

  const overall = breakdown.reduce(
    (sum, line) => sum + convertForDisplay(line.balance, line.currency, displayCurrency),
    0,
  );

  return (
    <GlassCard className="p-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {friend.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL, next/image can't optimize it
          <img src={friend.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold text-on-accent">
            {initials(friend.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-ink">{friend.name}</span>
            {friend.isShadow && (
              <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
                Pending
              </span>
            )}
          </div>
          {Math.abs(overall) < BALANCE_EPSILON ? (
            <p className="text-xs text-ink-soft">Settled up overall</p>
          ) : (
            <p className={`text-xs font-medium ${overall > 0 ? "text-owed" : "text-owes"}`}>
              {overall > 0 ? "Owes you" : "You owe"} {formatMoney(Math.abs(overall), displayCurrency)} overall
            </p>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-surface-border p-4 pt-3">
          {breakdown.length === 0 ? (
            <p className="text-xs text-ink-soft">No shared expenses yet.</p>
          ) : (
            breakdown.map((line) => (
              <Link
                key={line.ledgerId}
                href={`/ledgers/${line.ledgerId}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-strong"
              >
                <span className="text-ink-soft">
                  {line.ledgerName ?? LEDGER_TYPE_LABELS[line.ledgerType]}
                </span>
                {Math.abs(line.balance) < BALANCE_EPSILON ? (
                  <span className="text-ink-soft">Settled</span>
                ) : (
                  <span className={line.balance > 0 ? "text-owed" : "text-owes"}>
                    {line.balance > 0 ? "Owes you " : "You owe "}
                    {formatMoney(Math.abs(line.balance), line.currency)}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </GlassCard>
  );
}

export default function FriendsPage() {
  const { status, user, authFetch } = useAuth();
  const router = useRouter();

  const [relationships, setRelationships] = useState<FriendRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRelationships(await listFriends(authFetch));
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

  const displayCurrency = user?.defaultCurrency ?? "INR";

  return (
    <AppShell>
      <div className="w-full max-w-3xl space-y-6">
        <Reveal className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Friends</h1>
            <p className="text-sm text-ink-soft">
              Your overall balance with everyone you&rsquo;ve split with — personal tabs and
              every group combined. Each ledger still keeps its own balance; this is just a
              combined view.
            </p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
          >
            New personal ledger
          </button>
        </Reveal>

        {showNew && <PersonalLedgerForm />}

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : relationships.length === 0 ? (
          <EmptyState title="No friends yet" hint="Open a personal ledger or join a group to see people here." />
        ) : (
          <StaggerGroup className="space-y-2">
            {relationships.map((r) => (
              <StaggerItem key={r.friend.id}>
                <FriendRow relationship={r} displayCurrency={displayCurrency} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </AppShell>
  );
}
