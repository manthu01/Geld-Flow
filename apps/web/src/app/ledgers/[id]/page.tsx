"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LedgerView } from "@/components/ledger-view";
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
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <LedgerView ledgerId={params.id} />
    </main>
  );
}
