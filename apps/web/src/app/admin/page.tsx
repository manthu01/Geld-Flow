"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import {
  deleteAdminUser,
  getAdminStats,
  listAdminUsers,
  setUserPassword,
  wipeDatabase,
  type AdminStats,
  type AdminUserView,
} from "@/lib/api";

const USERS_PER_PAGE = 10;

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</p>
    </GlassCard>
  );
}

function SetPasswordModal({
  targetUser,
  onClose,
  onSaved,
}: {
  targetUser: AdminUserView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { authFetch } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setUserPassword(authFetch, targetUser.id, newPassword);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set that password.");
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <GlassCard className="w-full max-w-sm space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Set a new password</h2>
          <p className="text-xs text-ink-soft">
            For <span className="font-medium text-ink">{targetUser.name}</span> (@{targetUser.username}) — they&rsquo;ll need to use this the next time they sign in.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">New password</span>
            <input
              type="password"
              required
              autoFocus
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Confirm</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {error && <p className="text-sm text-owes">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Set password"}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>,
    document.body,
  );
}

function DeleteUserModal({
  targetUser,
  onClose,
  onDeleted,
}: {
  targetUser: AdminUserView;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { authFetch } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAdminUser(authFetch, targetUser.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that user.");
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <GlassCard className="w-full max-w-sm space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Remove user</h2>
          <p className="text-xs text-ink-soft">
            Remove <span className="font-medium text-ink">{targetUser.name}</span> (@
            {targetUser.username})? If they share no ledgers with anyone this deletes them
            outright; otherwise their account is redacted but shared history stays intact for
            everyone else. This cannot be undone.
          </p>
        </div>
        {error && <p className="text-sm text-owes">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex-1 rounded-lg bg-owes px-4 py-2 text-sm font-medium text-white transition-all hover:bg-owes/90 active:scale-95 disabled:opacity-60"
          >
            {busy ? "Removing…" : "Remove user"}
          </button>
        </div>
      </GlassCard>
    </div>,
    document.body,
  );
}

function DangerZone() {
  const { authFetch, logout } = useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWipe() {
    setBusy(true);
    setError(null);
    try {
      await wipeDatabase(authFetch);
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not wipe the database.");
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-medium text-owes">Danger zone</h2>
      <GlassCard className="space-y-3 border-owes/30 p-6">
        <div>
          <p className="text-sm font-medium text-ink">Wipe all data</p>
          <p className="text-xs text-ink-soft">
            Permanently deletes every user, ledger, expense, settlement, and everything else —
            a clean slate. Your own account (including this admin session) is deleted too; the
            badge catalog is untouched. This cannot be undone.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "WIPE" to confirm'
            className="w-full max-w-xs rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            disabled={confirmText !== "WIPE" || busy}
            onClick={handleWipe}
            className="rounded-lg bg-owes px-4 py-2 text-sm font-medium text-white transition-all hover:bg-owes/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Wiping…" : "Wipe all data"}
          </button>
        </div>
        {error && <p className="text-sm text-owes">{error}</p>}
      </GlassCard>
    </section>
  );
}

export default function AdminPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserView | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(authFetch),
        listAdminUsers(authFetch),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err) {
      if (err instanceof Error && /forbidden|not authorized/i.test(err.message)) {
        setForbidden(true);
      }
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

  const filteredUsers = search.trim()
    ? users.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase()))
    : users;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE,
  );

  if (status !== "authenticated") return null;

  return (
    <AppShell>
      <div className="w-full max-w-6xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-ink-soft">How Geld Flow is actually doing.</p>
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : forbidden ? (
          <GlassCard className="p-6 text-sm text-ink-soft">
            Not authorized to view this.
          </GlassCard>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatTile label="Users" value={stats.userCount} />
                <StatTile label="New this week" value={stats.newUsersLast7Days} />
                <StatTile label="Personal ledgers" value={stats.personalLedgerCount} />
                <StatTile label="Group ledgers" value={stats.groupLedgerCount} />
                <StatTile label="Expenses logged" value={stats.expenseCount} />
                <StatTile label="Total expense volume" value={stats.totalExpenseVolume} />
                <StatTile label="Settlements" value={stats.settlementCount} />
                <StatTile label="Confirmed settlements" value={stats.confirmedSettlementCount} />
              </div>
            )}

            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-lg font-medium">Users</h2>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by username…"
                  className="w-full max-w-xs rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <GlassCard className="overflow-x-auto p-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Username</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Password</th>
                      <th className="px-4 py-3 font-medium">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {pagedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                          No users match &ldquo;{search}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="px-4 py-3 text-ink">{u.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-accent-strong">@{u.username}</td>
                          <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-ink-soft">
                                {u.hasPassword ? "••••••••" : "Not set"}
                              </span>
                              <button
                                onClick={() => setEditingUser(u)}
                                aria-label={`Set a new password for ${u.name}`}
                                className="rounded-md p-1 text-ink-soft hover:bg-surface-strong hover:text-ink"
                              >
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path
                                    d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDeletingUser(u)}
                              aria-label={`Remove ${u.name}`}
                              className="rounded-md p-1 text-ink-soft hover:bg-owes/10 hover:text-owes"
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path
                                  d="M5 6h10M8.5 6V4.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V6M6.5 6l.6 9a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-9"
                                  stroke="currentColor"
                                  strokeWidth="1.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </GlassCard>
              {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between text-sm text-ink-soft">
                  <span>
                    Page {currentPage} of {totalPages} &middot; {filteredUsers.length} user
                    {filteredUsers.length === 1 ? "" : "s"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>

            <DangerZone />
          </>
        )}
      </div>

      {editingUser && (
        <SetPasswordModal
          targetUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            void load();
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          targetUser={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => {
            setDeletingUser(null);
            void load();
          }}
        />
      )}
    </AppShell>
  );
}
