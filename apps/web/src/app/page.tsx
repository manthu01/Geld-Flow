import { GlassCard } from "@/components/glass-card";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Phase 0 — foundations
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Geld Flow
          </h1>
          <p className="text-sm text-ink-soft">
            Design tokens and the base glass surface are wired up. Product
            screens start in Phase 1.
          </p>
        </div>

        <GlassCard className="p-5 space-y-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Weekend trip</span>
            <span className="font-mono text-xs text-ink-soft">Group</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm">You&rsquo;re owed</span>
            <span className="font-mono text-2xl font-medium text-owed">
              $128.40
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm">You owe</span>
            <span className="font-mono text-2xl font-medium text-owes">
              $42.00
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <p className="text-sm text-ink-soft">
            Accent —{" "}
            <span className="font-medium text-accent-strong">
              settle up
            </span>{" "}
            actions and rank badges use this color; balances stay on the
            owed/owes semantic colors above.
          </p>
        </GlassCard>
      </div>
    </main>
  );
}
