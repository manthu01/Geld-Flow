"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { ExpenseForm } from "@/components/expense-form";
import { ChecklistPanel } from "@/components/checklist-panel";
import { TripStatsPanel } from "@/components/trip-stats-panel";
import { TelegramConnect } from "@/components/telegram-connect";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/auth-context";
import {
  confirmSettlement,
  createInvite,
  declineSettlement,
  deleteExpense,
  getBalances,
  getDebtSimplification,
  getLedgerDetail,
  getUserScore,
  listActivity,
  listExpenses,
  listSettlements,
  requestSettlement,
  type ActivityEventView,
  type ExpenseView,
  type LedgerDetail,
  type MemberBalance,
  type ScoreView,
  type SettlementView,
  type SimplifiedTransfer,
} from "@/lib/api";

function rankLabel(score: ScoreView | undefined): string {
  return score ? `Rank ${score.currentRank}` : "";
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  group_general: "General group",
  group_travel: "Travel group",
  group_event: "Event group",
  personal: "Personal ledger",
};

function describeActivity(event: ActivityEventView): string {
  const actor = event.actor.name;
  switch (event.type) {
    case "expense_added":
      return `${actor} added "${event.payload.description ?? "an expense"}"`;
    case "expense_edited":
      return `${actor} edited "${event.payload.description ?? "an expense"}"`;
    case "expense_deleted":
      return `${actor} deleted "${event.payload.description ?? "an expense"}"`;
    case "settlement_requested":
      return `${actor} recorded a payment of ${event.payload.amount ?? ""}`;
    case "settlement_confirmed":
      return `${actor} confirmed a payment of ${event.payload.amount ?? ""}`;
    case "settlement_declined":
      return `${actor} declined a settlement`;
    case "member_joined":
      return `${actor} joined the ledger`;
    default:
      return `${actor} — ${event.type}`;
  }
}

export function LedgerView({ ledgerId }: { ledgerId: string }) {
  const { user, authFetch } = useAuth();

  const [ledger, setLedger] = useState<LedgerDetail | null>(null);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [activity, setActivity] = useState<ActivityEventView[]>([]);
  const [settlements, setSettlements] = useState<SettlementView[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreView>>({});
  const [debtSuggestions, setDebtSuggestions] = useState<SimplifiedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseView | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<string | null>(null);
  const [settleAmountHint, setSettleAmountHint] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ledgerData, balanceData, expenseData, activityData, settlementData] =
        await Promise.all([
          getLedgerDetail(authFetch, ledgerId),
          getBalances(authFetch, ledgerId),
          listExpenses(authFetch, ledgerId),
          listActivity(authFetch, ledgerId),
          listSettlements(authFetch, ledgerId),
        ]);
      setLedger(ledgerData);
      setBalances(balanceData);
      setExpenses(expenseData.items);
      setActivity(activityData.items);
      setSettlements(settlementData);

      const scoreEntries = await Promise.all(
        ledgerData.members.map(
          async (m) => [m.userId, await getUserScore(authFetch, m.userId)] as const,
        ),
      );
      setScores(Object.fromEntries(scoreEntries));

      // Simplification is only meaningful for 3+ people — a personal
      // ledger is already just the two of you.
      setDebtSuggestions(
        ledgerData.type === "personal"
          ? []
          : await getDebtSimplification(authFetch, ledgerId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this ledger.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, ledgerId]);

  useEffect(() => {
    // Data fetch on mount, not a render-loop synchronization — the rule's
    // false-positive case for this pattern (see auth-context.tsx history).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleInvite() {
    setActionError(null);
    try {
      const { inviteUrl } = await createInvite(authFetch, ledgerId);
      setInviteUrl(inviteUrl);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create an invite.");
    }
  }

  async function handleDelete(expense: ExpenseView) {
    if (!window.confirm(`Delete "${expense.description}"?`)) return;
    setActionError(null);
    try {
      await deleteExpense(authFetch, expense.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete that expense.");
    }
  }

  async function handleSettleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settleTarget || !ledger) return;
    const form = new FormData(event.currentTarget);
    setActionError(null);
    try {
      await requestSettlement(authFetch, ledgerId, {
        toUserId: settleTarget,
        amount: Number(form.get("amount")),
        currency: ledger.baseCurrency,
      });
      setSettleTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not record that payment.");
    }
  }

  async function handleConfirmSettlement(id: string) {
    setActionError(null);
    try {
      await confirmSettlement(authFetch, id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not confirm that payment.");
    }
  }

  async function handleDeclineSettlement(id: string) {
    setActionError(null);
    try {
      await declineSettlement(authFetch, id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not decline that payment.");
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading ledger…</p>;
  }
  if (error || !ledger) {
    return <p className="text-sm text-owes">{error ?? "Ledger not found."}</p>;
  }

  const canManage = ledger.myRole === "owner" || ledger.myRole === "admin";
  const memberById = new Map(ledger.members.map((m) => [m.userId, m.user]));
  const pendingForMe = settlements.filter(
    (s) => s.status === "pending" && s.toUserId === user?.id,
  );

  return (
    <div className="animate-fade-in-up w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <Link href="/" className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink">
          ← All ledgers
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {ledger.name ?? GROUP_TYPE_LABELS[ledger.type]}
          </h1>
          <span className="font-mono text-xs text-ink-soft">
            {GROUP_TYPE_LABELS[ledger.type]}
          </span>
        </div>
      </div>

      {actionError && <p className="text-sm text-owes">{actionError}</p>}

      {ledger.type === "group_travel" && (
        <TripStatsPanel expenses={expenses} currency={ledger.baseCurrency} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium">Expenses</h2>
              <div className="flex gap-2">
                {ledger.type !== "personal" && canManage && (
                  <button
                    onClick={handleInvite}
                    className="rounded-lg border border-surface-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-strong active:scale-95"
                  >
                    Invite
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAddExpense((v) => !v);
                    setEditingExpense(null);
                  }}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-strong active:scale-95"
                >
                  Add expense
                </button>
              </div>
            </div>

            {inviteUrl && (
              <p className="break-all text-xs text-ink-soft">
                Share this link: <span className="text-accent-strong">{inviteUrl}</span>
              </p>
            )}

            {showAddExpense && (
              <ExpenseForm
                ledgerId={ledgerId}
                currency={ledger.baseCurrency}
                members={ledger.members}
                onSaved={async () => {
                  setShowAddExpense(false);
                  await load();
                }}
                onCancel={() => setShowAddExpense(false)}
              />
            )}

            {editingExpense && (
              <ExpenseForm
                ledgerId={ledgerId}
                currency={ledger.baseCurrency}
                members={ledger.members}
                initial={editingExpense}
                onSaved={async () => {
                  setEditingExpense(null);
                  await load();
                }}
                onCancel={() => setEditingExpense(null)}
              />
            )}

            {expenses.length === 0 ? (
              <EmptyState title="No expenses yet" hint="Add the first one above." />
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => {
                  const canEdit = canManage || e.createdById === user?.id;
                  return (
                    <GlassCard key={e.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink">{e.description}</p>
                          <p className="text-xs text-ink-soft">
                            {e.paidBy.name} paid · {e.splitType}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-ink">
                            {e.amount} {e.currency}
                          </span>
                          {canEdit && (
                            <div className="flex gap-2 text-xs">
                              <button
                                onClick={() => {
                                  setEditingExpense(e);
                                  setShowAddExpense(false);
                                }}
                                className="text-accent-strong underline underline-offset-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(e)}
                                className="text-owes underline underline-offset-2"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </section>

          {ledger.type === "group_event" && (
            <ChecklistPanel ledgerId={ledgerId} members={ledger.members} />
          )}

          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium">Activity</h2>
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <GlassCard className="divide-y divide-surface-border p-0">
                {activity.map((event) => (
                  <div key={event.id} className="px-4 py-3 text-sm text-ink-soft">
                    {describeActivity(event)}
                  </div>
                ))}
              </GlassCard>
            )}
          </section>
        </div>

        {/* Right rail */}
        <div className="space-y-6 lg:sticky lg:top-20">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium">Balances</h2>
            <GlassCard className="divide-y divide-surface-border p-0">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink">
                    {b.userId === user?.id ? "You" : b.name}{" "}
                    <span className="font-mono text-xs text-ink-soft">
                      {rankLabel(scores[b.userId])}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-sm font-medium ${
                        b.netBalance > 0
                          ? "text-owed"
                          : b.netBalance < 0
                            ? "text-owes"
                            : "text-ink-soft"
                      }`}
                    >
                      {b.netBalance > 0 ? "+" : ""}
                      {b.netBalance.toFixed(2)} {ledger.baseCurrency}
                    </span>
                    {b.userId !== user?.id && (
                      <button
                        onClick={() => {
                          setSettleTarget(b.userId);
                          setSettleAmountHint("");
                        }}
                        className="text-xs text-accent-strong underline underline-offset-2"
                      >
                        Settle up
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </GlassCard>
          </section>

          {debtSuggestions.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-medium">Simplify debts</h2>
              <p className="text-xs text-ink-soft">
                The fewest payments that would settle everyone up.
              </p>
              <GlassCard className="divide-y divide-surface-border p-0">
                {debtSuggestions.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 text-sm text-ink"
                  >
                    <span>
                      {t.fromUserId === user?.id ? "You" : memberById.get(t.fromUserId)?.name}{" "}
                      owe{t.fromUserId === user?.id ? "" : "s"}{" "}
                      {t.toUserId === user?.id ? "you" : memberById.get(t.toUserId)?.name}{" "}
                      <span className="font-mono">
                        {t.amount.toFixed(2)} {ledger.baseCurrency}
                      </span>
                    </span>
                    {t.fromUserId === user?.id && (
                      <button
                        onClick={() => {
                          setSettleTarget(t.toUserId);
                          setSettleAmountHint(String(t.amount));
                        }}
                        className="text-xs text-accent-strong underline underline-offset-2"
                      >
                        Settle this
                      </button>
                    )}
                  </div>
                ))}
              </GlassCard>
            </section>
          )}

          {pendingForMe.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-medium">Awaiting your confirmation</h2>
              {pendingForMe.map((s) => (
                <GlassCard key={s.id} className="flex items-center justify-between p-4">
                  <span className="text-sm text-ink">
                    {memberById.get(s.fromUserId)?.name ?? "Someone"} says they paid you{" "}
                    <span className="font-mono">{s.amount} {s.currency}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmSettlement(s.id)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-strong active:scale-95"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleDeclineSettlement(s.id)}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-strong active:scale-95"
                    >
                      Decline
                    </button>
                  </div>
                </GlassCard>
              ))}
            </section>
          )}

          {settleTarget && (
            <GlassCard className="space-y-3 p-5">
              <form onSubmit={handleSettleSubmit} className="space-y-3">
                <p className="text-sm text-ink">
                  Record a payment to{" "}
                  <span className="font-medium">{memberById.get(settleTarget)?.name}</span>
                </p>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={settleAmountHint || undefined}
                  placeholder="0.00"
                  className="w-32 rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
                  >
                    Record payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleTarget(null)}
                    className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-strong active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {ledger.type !== "personal" && <TelegramConnect ledgerId={ledgerId} />}
        </div>
      </div>
    </div>
  );
}
