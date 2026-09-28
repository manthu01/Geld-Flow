"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import {
  getAdminStats,
  listAdminUsers,
  setUserPassword,
  type AdminStats,
  type AdminUserView,
} from "@/lib/api";

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

export default function AdminPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);

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
              <h2 className="font-display text-lg font-medium">Users</h2>
              <GlassCard className="overflow-x-auto p-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Username</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {users.map((u) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </section>
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
    </AppShell>
  );
}
