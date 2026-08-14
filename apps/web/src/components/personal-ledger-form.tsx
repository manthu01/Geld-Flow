"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import { getOrCreatePersonalLedger } from "@/lib/api";

type Mode = "email" | "name";

/**
 * "They have an account" looks them up by email and opens the ledger
 * directly. "Add by name" creates a shadow (unclaimed) member with no
 * account yet — the returned claim link is what lets that person attach
 * their real account later and inherit the ledger's history.
 */
export function PersonalLedgerForm() {
  const { authFetch } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ ledgerId: string; claimUrl: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const input =
        mode === "email"
          ? { peerEmail: String(form.get("peerEmail") || ""), baseCurrency: "USD" }
          : { peerName: String(form.get("peerName") || ""), baseCurrency: "USD" };
      const { ledger, claimUrl } = await getOrCreatePersonalLedger(authFetch, input);
      if (claimUrl) {
        setCreated({ ledgerId: ledger.id, claimUrl });
        setBusy(false);
      } else {
        router.push(`/ledgers/${ledger.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that personal ledger.");
      setBusy(false);
    }
  }

  if (created) {
    return (
      <GlassCard className="space-y-3 p-5">
        <p className="text-sm text-ink">
          Ledger created. Send this link so they can connect once they sign up —
          it&rsquo;ll attach their account and hand over everything recorded here.
        </p>
        <a
          href={created.claimUrl}
          target="_blank"
          rel="noreferrer"
          className="block break-all rounded-lg border border-surface-border bg-bg px-3 py-2 text-xs text-accent-strong underline underline-offset-2"
        >
          {created.claimUrl}
        </a>
        <button
          onClick={() => router.push(`/ledgers/${created.ledgerId}`)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95"
        >
          Go to ledger
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-3 p-5">
      <div className="flex gap-1 rounded-lg bg-bg p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "email" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
          }`}
        >
          They have an account
        </button>
        <button
          type="button"
          onClick={() => setMode("name")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "name" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
          }`}
        >
          Add by name
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "email" ? (
          <input
            key="email"
            name="peerEmail"
            type="email"
            required
            placeholder="Their email address"
            className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <input
            key="name"
            name="peerName"
            required
            maxLength={80}
            placeholder="Their name"
            className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        {mode === "name" && (
          <p className="text-xs text-ink-soft">
            You&rsquo;ll get a link to send them — they can connect their account to
            this split whenever they&rsquo;re ready.
          </p>
        )}
        {error && <p className="text-sm text-owes">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95 disabled:opacity-60"
        >
          {busy ? "Opening…" : "Open personal ledger"}
        </button>
      </form>
    </GlassCard>
  );
}
