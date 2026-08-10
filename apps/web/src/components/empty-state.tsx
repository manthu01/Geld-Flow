export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface/40 px-4 py-8 text-center backdrop-blur-sm">
      <p className="text-sm text-ink-soft">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft/70">{hint}</p>}
    </div>
  );
}
