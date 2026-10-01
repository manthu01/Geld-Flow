"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import { getMyScore, listMyLedgers, type LedgerSummary, type ScoreView } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/groups", label: "Groups" },
  { href: "/friends", label: "Friends" },
  { href: "/activity", label: "Activity" },
  { href: "/", label: "Dashboard" },
  { href: "/account", label: "Account" },
] as const;

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent-tint text-accent-strong" : "text-ink-soft hover:bg-surface-strong hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

function NavLedgerLink({
  ledger,
  currentUserId,
  onNavigate,
}: {
  ledger: LedgerSummary;
  currentUserId: string | undefined;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === `/ledgers/${ledger.id}`;
  // Personal ledgers never have a `name` (they're a pairing between two
  // people, not something you title) — the useful label is the other
  // person's name, same as the dashboard's own ledger cards already do.
  const peer = ledger.members.find((m) => m.userId !== currentUserId);
  const label = ledger.name ?? peer?.user.name ?? "Personal ledger";
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
      {label}
    </Link>
  );
}

function useLedgerNav() {
  const { authFetch, user } = useAuth();
  const [groups, setGroups] = useState<LedgerSummary[]>([]);
  const [personal, setPersonal] = useState<LedgerSummary[]>([]);
  const [score, setScore] = useState<ScoreView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ledgers, scoreData] = await Promise.all([
        listMyLedgers(authFetch),
        getMyScore(authFetch),
      ]);
      setGroups(ledgers.groups);
      setPersonal(ledgers.personal);
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

  return { groups, personal, score, loading, error, reload: load, currentUserId: user?.id };
}

type LedgerNavData = ReturnType<typeof useLedgerNav>;

// Fetched once here and shared, instead of each consumer (the sidebar,
// the profile menu, and the Dashboard all independently wanted this same
// {groups, personal, score}) running its own copy of the fetch — that
// used to mean /ledgers and /reputation/me each fired 2-3 times on a
// single page load.
const LedgerNavContext = createContext<LedgerNavData | null>(null);

export function useLedgerNavData(): LedgerNavData {
  const ctx = useContext(LedgerNavContext);
  if (!ctx) {
    throw new Error("useLedgerNavData must be used within AppShell");
  }
  return ctx;
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function SidebarContent({
  onNavigate,
  groups,
  personal,
  currentUserId,
}: {
  onNavigate: () => void;
  groups: LedgerSummary[];
  personal: LedgerSummary[];
  currentUserId: string | undefined;
}) {
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
        <img src="/geld-flow-icon.jpg" alt="" className="h-7 w-7 rounded-lg" />
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Geld Flow
        </span>
      </Link>

      <nav className="mt-6 flex flex-col gap-1 border-b border-surface-border pb-5 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto">
        <div className="space-y-1.5">
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Groups
          </p>
          {groups.length === 0 ? (
            <p className="px-3 text-xs text-ink-soft">None yet</p>
          ) : (
            groups.map((g) => (
              <NavLedgerLink key={g.id} ledger={g} currentUserId={currentUserId} onNavigate={onNavigate} />
            ))
          )}
        </div>

        <div className="space-y-1.5">
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Friends
          </p>
          {personal.length === 0 ? (
            <p className="px-3 text-xs text-ink-soft">None yet</p>
          ) : (
            personal.map((p) => (
              <NavLedgerLink key={p.id} ledger={p} currentUserId={currentUserId} onNavigate={onNavigate} />
            ))
          )}
        </div>
      </nav>

      {/* Not a security boundary — just avoids showing a link that would
          403 for everyone else. The API's own ADMIN_EMAIL is what
          actually gates /admin/*. */}
      {ADMIN_EMAIL && user?.email === ADMIN_EMAIL && (
        <Link
          href="/admin"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-ink-soft/50 hover:text-ink-soft"
          title="Admin"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2 3 5v5c0 4.1 2.9 7.4 7 8 4.1-.6 7-3.9 7-8V5l-7-3Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          Admin
        </Link>
      )}
    </div>
  );
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function Avatar({ name, avatarUrl, className }: { name: string | undefined; avatarUrl: string | null | undefined; className: string }) {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL, next/image can't optimize it
      <img
        src={avatarUrl}
        alt=""
        className={`${className} object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-accent font-mono font-semibold text-on-accent`}>
      {initials(name)}
    </div>
  );
}

function ProfileMenu({ score }: { score: ScoreView | null }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="overflow-hidden rounded-full"
      >
        <Avatar name={user?.name} avatarUrl={user?.avatarUrl} className="h-9 w-9 text-xs" />
      </button>

      {open && (
        <GlassCard className="absolute right-0 top-11 z-50 w-64 overflow-hidden p-0 shadow-[var(--glass-shadow)]">
          <div className="flex items-center gap-3 border-b border-surface-border bg-surface-strong/40 p-4">
            <Avatar name={user?.name} avatarUrl={user?.avatarUrl} className="h-11 w-11 shrink-0 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
              <p className="truncate font-mono text-xs text-accent-strong">@{user?.username}</p>
            </div>
          </div>

          <div className="space-y-1 px-4 py-3 text-xs text-ink-soft">
            <p className="truncate">{user?.email}</p>
            {score && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2 py-0.5 font-mono text-accent-strong">
                Rank {score.currentRank} · {score.confirmedSettlements} settled
              </p>
            )}
          </div>

          <div className="space-y-0.5 border-t border-surface-border p-2">
            <button
              onClick={() => {
                setEditing(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink-soft hover:bg-surface-strong hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Edit profile
            </button>
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink-soft hover:bg-surface-strong hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M7.5 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17h3M13 13.5l3.5-3.5L13 6.5M16.25 10H8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
          </div>
        </GlassCard>
      )}

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Called once here instead of once per consumer — SidebarContent (x2,
  // desktop + mobile drawer), ProfileMenu, and the Dashboard all used to
  // each run their own copy of this hook, firing /ledgers and
  // /reputation/me 2-3 times on a single page load. Shared via context
  // below instead.
  const ledgerNav = useLedgerNav();
  const { groups, personal, score, currentUserId } = ledgerNav;

  return (
    <LedgerNavContext.Provider value={ledgerNav}>
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-surface-border bg-surface/60 px-4 py-5 backdrop-blur-xl lg:flex">
        <SidebarContent
          onNavigate={() => {}}
          groups={groups}
          personal={personal}
          currentUserId={currentUserId}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-surface-border bg-bg-elevated px-4 py-5 shadow-2xl">
            <SidebarContent
              onNavigate={() => setDrawerOpen(false)}
              groups={groups}
              personal={personal}
              currentUserId={currentUserId}
            />
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

          <Link href="/" className="flex items-center gap-2 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-6 w-6 rounded-md" />
          </Link>

          <nav className="hidden gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} onNavigate={() => {}} />
            ))}
          </nav>

          <div className="ml-auto">
            <ProfileMenu score={score} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
    </LedgerNavContext.Provider>
  );
}
