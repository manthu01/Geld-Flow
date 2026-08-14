"use client";

import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import type { LedgerSummary } from "@/lib/api";

export const GROUP_TYPE_LABELS: Record<string, string> = {
  group_general: "General",
  group_travel: "Travel",
  group_event: "Event",
};

export function LedgerCard({
  ledger,
  subtitle,
  pending,
}: {
  ledger: LedgerSummary;
  subtitle: string;
  pending?: boolean;
}) {
  const router = useRouter();
  return (
    <GlassCard
      className="cursor-pointer p-4"
      interactive
      glow
      onClick={() => router.push(`/ledgers/${ledger.id}`)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-ink">
          {ledger.name ?? subtitle}
        </span>
        <span className="font-mono text-xs text-ink-soft">
          {ledger.type === "personal"
            ? "Personal"
            : GROUP_TYPE_LABELS[ledger.type]}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xs text-ink-soft">
          {ledger.type === "personal" ? subtitle : `${ledger._count?.members ?? ledger.members.length} members`}
        </p>
        {pending && (
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
            Pending
          </span>
        )}
      </div>
    </GlassCard>
  );
}
