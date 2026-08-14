"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LedgerCard } from "@/components/ledger-card";
import { PersonalLedgerForm } from "@/components/personal-ledger-form";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { listMyLedgers, type LedgerSummary } from "@/lib/api";

export default function PersonalPage() {
  const { status, user, authFetch } = useAuth();
  const router = useRouter();

  const [personal, setPersonal] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyLedgers(authFetch);
      setPersonal(data.personal);
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
        <Reveal className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Personal</h1>
            <p className="text-sm text-ink-soft">One-on-one splits between you and a friend.</p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
          >
            New personal ledger
          </button>
        </Reveal>

        {showNew && <PersonalLedgerForm />}

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : personal.length === 0 ? (
          <EmptyState title="No personal ledgers yet" hint="Open one with a friend's email above." />
        ) : (
          <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {personal.map((p) => {
              const peer = p.members.find((m) => m.userId !== user?.id);
              return (
                <StaggerItem key={p.id}>
                  <LedgerCard
                    ledger={p}
                    subtitle={peer?.user.name ?? "Personal ledger"}
                    pending={peer?.user.isShadow}
                  />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </div>
    </AppShell>
  );
}
