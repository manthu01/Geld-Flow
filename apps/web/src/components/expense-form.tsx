"use client";

import { useState, type FormEvent } from "react";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import {
  createExpense,
  editExpense,
  type ExpenseView,
  type LedgerMemberView,
} from "@/lib/api";

type SplitType = "equal" | "percentage" | "exact";

interface ParticipantState {
  included: boolean;
  amount: string;
  percentage: string;
}

function initialParticipants(
  members: LedgerMemberView[],
  initial?: ExpenseView,
): Record<string, ParticipantState> {
  const state: Record<string, ParticipantState> = {};
  for (const m of members) {
    const share = initial?.shares.find((s) => s.userId === m.userId);
    state[m.userId] = {
      included: initial ? Boolean(share) : true,
      amount: share ? share.shareAmount : "",
      percentage: share?.sharePercentage ?? "",
    };
  }
  return state;
}

export function ExpenseForm({
  ledgerId,
  currency,
  members,
  initial,
  onSaved,
  onCancel,
}: {
  ledgerId: string;
  currency: string;
  members: LedgerMemberView[];
  initial?: ExpenseView;
  onSaved: (expense: ExpenseView) => void;
  onCancel: () => void;
}) {
  const { user, authFetch } = useAuth();
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [paidByUserId, setPaidByUserId] = useState(
    initial?.paidByUserId ?? user?.id ?? members[0]?.userId ?? "",
  );
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "equal");
  const [participants, setParticipants] = useState(initialParticipants(members, initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParticipant(userId: string, patch: Partial<ParticipantState>) {
    setParticipants((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const included = members.filter((m) => participants[m.userId]?.included);
    if (included.length === 0) {
      setError("Pick at least one person to split this with.");
      return;
    }

    const amountNum = Number(amount);
    if (!(amountNum > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const shares = included.map((m) => {
      const p = participants[m.userId];
      if (splitType === "exact") return { userId: m.userId, amount: Number(p.amount) };
      if (splitType === "percentage")
        return { userId: m.userId, percentage: Number(p.percentage) };
      return { userId: m.userId };
    });

    setBusy(true);
    try {
      const payload = {
        ledgerId,
        description,
        amount: amountNum,
        currency,
        paidByUserId,
        splitType,
        category: category || undefined,
        shares,
      };
      const saved = initial
        ? await editExpense(authFetch, initial.id, payload)
        : await createExpense(authFetch, payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="space-y-4 p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it for?"
            className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-ink-soft">{currency}</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-28 rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Paid by</span>
            <select
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Split</span>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as SplitType)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="equal">Equally</option>
              <option value="percentage">By percentage</option>
              <option value="exact">By exact amount</option>
            </select>
          </label>
        </div>

        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-ink-soft">
            Split between
          </span>
          <div className="space-y-2">
            {members.map((m) => {
              const p = participants[m.userId];
              return (
                <div key={m.userId} className="flex items-center gap-3">
                  <label className="flex flex-1 items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={p?.included ?? false}
                      onChange={(e) =>
                        updateParticipant(m.userId, { included: e.target.checked })
                      }
                    />
                    {m.user.name}
                  </label>
                  {p?.included && splitType === "exact" && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.amount}
                      onChange={(e) =>
                        updateParticipant(m.userId, { amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-24 rounded-lg border border-surface-border bg-bg px-2 py-1 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  )}
                  {p?.included && splitType === "percentage" && (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={p.percentage}
                      onChange={(e) =>
                        updateParticipant(m.userId, { percentage: e.target.value })
                      }
                      placeholder="%"
                      className="w-20 rounded-lg border border-surface-border bg-bg px-2 py-1 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-owes">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "Saving…" : initial ? "Save changes" : "Add expense"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
