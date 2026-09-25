"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GlassCard } from "@/components/glass-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/auth-context";
import {
  createChecklistItem,
  deleteChecklistItem,
  editChecklistItem,
  listChecklist,
  type ChecklistItemView,
  type LedgerMemberView,
} from "@/lib/api";

export function ChecklistPanel({
  ledgerId,
  members,
}: {
  ledgerId: string;
  members: LedgerMemberView[];
}) {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<ChecklistItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listChecklist(authFetch, ledgerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the checklist.");
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

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const assignedToId = String(form.get("assignedToId") || "") || undefined;
    setError(null);
    try {
      await createChecklistItem(authFetch, ledgerId, { title, assignedToId });
      formEl.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that item.");
    }
  }

  async function handleToggle(item: ChecklistItemView) {
    setError(null);
    try {
      await editChecklistItem(authFetch, item.id, { isDone: !item.isDone });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that item.");
    }
  }

  async function handleDelete(item: ChecklistItemView) {
    setError(null);
    try {
      await deleteChecklistItem(authFetch, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that item.");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-medium">Checklist</h2>
      {error && <p className="text-sm text-owes">{error}</p>}

      <GlassCard className="space-y-3 p-4">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input
            name="title"
            required
            placeholder="Add a task…"
            className="min-w-[10rem] flex-1 rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            name="assignedToId"
            defaultValue=""
            className="rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-strong active:scale-95"
          >
            Add
          </button>
        </form>
      </GlassCard>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading checklist…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No tasks yet" />
      ) : (
        <GlassCard className="divide-y divide-surface-border p-0">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={item.isDone}
                  onChange={() => handleToggle(item)}
                />
                <span className={item.isDone ? "text-ink-soft line-through" : ""}>
                  {item.title}
                </span>
                {item.assignedTo && (
                  <span className="text-xs text-ink-soft">· {item.assignedTo.name}</span>
                )}
              </label>
              <button
                onClick={() => handleDelete(item)}
                className="text-xs text-owes underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </GlassCard>
      )}
    </section>
  );
}
