"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getMyScore, listMyLedgers, type LedgerSummary, type ScoreView } from "@/lib/api";

function NavLedgerLink({ ledger, onNavigate }: { ledger: LedgerSummary; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === `/ledgers/${ledger.id}`;
  return (
    <Link
      href={`/ledgers/${ledger.id}`}
      onClick={onNavigate}
      className={`block truncate rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent-tint font-medium text-accent-strong"
          : "text-ink-soft hover:bg-surface-strong hover:text-ink"
      }`}
    >
      {ledger.name ?? "Personal ledger"}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { user, authFetch, logout } = useAuth();
  const [groups, setGroups] = useState<LedgerSummary[]>([]);
  const [personal, setPersonal] = useState<LedgerSummary[]>([]);
  const [score, setScore] = useState<ScoreView | null>(null);

  const load = useCallback(async () => {
    try {
      const [ledgers, scoreData] = await Promise.all([
        listMyLedgers(authFetch),
        getMyScore(authFetch),
      ]);
      setGroups(ledgers.groups);
      setPersonal(ledgers.personal);
      setScore(scoreData);
    } catch {
      // Sidebar nav is a convenience, not core functionality — fail quiet.
    }
  }, [authFetch]);

  useEffect(() => {
    // Data fetch on mount, not a render-loop synchronization — the rule's
    // false-positive case for this pattern (see auth-context.tsx history).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
        <img src="/geld-flow-icon.jpg" alt="" className="h-7 w-7 rounded-lg" />
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Geld Flow
        </span>
      </Link>

      <nav className="mt-6 flex-1 space-y-5 overflow-y-auto">
        <Link
          href="/"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-strong"
        >
          Dashboard
        </Link>

        <div className="space-y-1.5">
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Groups
          </p>
          {groups.length === 0 ? (
            <p className="px-3 text-xs text-ink-soft">None yet</p>
          ) : (
            groups.map((g) => <NavLedgerLink key={g.id} ledger={g} onNavigate={onNavigate} />)
          )}
        </div>

        <div className="space-y-1.5">
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Personal
          </p>
          {personal.length === 0 ? (
            <p className="px-3 text-xs text-ink-soft">None yet</p>
          ) : (
            personal.map((p) => <NavLedgerLink key={p.id} ledger={p} onNavigate={onNavigate} />)
          )}
        </div>
      </nav>

      <div className="space-y-2 border-t border-surface-border pt-3">
        <p className="truncate px-1 text-sm font-medium text-ink">{user?.name}</p>
        {score && (
          <p className="px-1 font-mono text-xs text-ink-soft">Rank {score.currentRank}</p>
        )}
        <button
          onClick={() => void logout()}
          className="px-1 text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-surface-border bg-surface/60 px-4 py-5 backdrop-blur-xl lg:flex">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 w-72 border-r border-surface-border bg-bg-elevated px-4 py-5 shadow-2xl">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-surface-border bg-bg/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-10">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-ink hover:bg-surface-strong lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="truncate font-display text-base font-semibold text-ink sm:text-lg">
            {title}
          </h1>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
