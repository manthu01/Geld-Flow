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
}: {
  ledger: LedgerSummary;
  subtitle: string;
}) {
  const router = useRouter();
  return (
    <GlassCard
      className="cursor-pointer p-4"
      interactive
      glow
      onClick={() => router.push(`/ledgers/${ledger.id}`)}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink">
          {ledger.name ?? subtitle}
        </span>
        <span className="font-mono text-xs text-ink-soft">
          {ledger.type === "personal"
            ? "Personal"
            : GROUP_TYPE_LABELS[ledger.type]}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {ledger.type === "personal" ? subtitle : `${ledger._count?.members ?? ledger.members.length} members`}
      </p>
    </GlassCard>
  );
}
