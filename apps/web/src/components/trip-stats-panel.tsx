"use client";

import { GlassCard } from "@/components/glass-card";
import type { ExpenseView } from "@/lib/api";

export function TripStatsPanel({
  expenses,
  currency,
}: {
  expenses: ExpenseView[];
  currency: string;
}) {
  if (expenses.length === 0) {
    return null;
  }

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.trim() || "Uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount));
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const timestamps = expenses.map((e) => new Date(e.createdAt).getTime());
  const spanDays =
    Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24)) + 1;
  const perDay = totalSpent / spanDays;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-medium">Trip stats</h2>
      <GlassCard className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Total spent</p>
          <p className="font-mono text-lg font-medium text-ink">
            {totalSpent.toFixed(2)} {currency}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Expenses</p>
          <p className="font-mono text-lg font-medium text-ink">{expenses.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Per day</p>
          <p className="font-mono text-lg font-medium text-ink">
            {perDay.toFixed(2)} {currency}
          </p>
        </div>
      </GlassCard>
      <GlassCard className="divide-y divide-surface-border p-0">
        {categories.map(([category, amount]) => (
          <div key={category} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-ink">{category}</span>
            <span className="font-mono text-ink-soft">
              {amount.toFixed(2)} {currency}
            </span>
          </div>
        ))}
      </GlassCard>
    </section>
  );
}
