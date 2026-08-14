"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LedgerView } from "@/components/ledger-view";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

export default function LedgerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <AppShell>
      <LedgerView ledgerId={params.id} />
    </AppShell>
  );
}
