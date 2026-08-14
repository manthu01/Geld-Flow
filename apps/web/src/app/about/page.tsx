"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Reveal } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { submitFeedback } from "@/lib/api";

export default function AboutPage() {
  const { status, authFetch } = useAuth();
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [status_, setStatus_] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus_("sending");
    setError(null);
    try {
      await submitFeedback(authFetch, message);
      setMessage("");
      setStatus_("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your feedback.");
      setStatus_("error");
    }
  }

  return (
    <AppShell>
      <div className="w-full max-w-3xl space-y-8">
        <Reveal className="space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">About Geld Flow</h1>
          <p className="text-sm text-ink-soft">
            Geld Flow keeps every ledger — a group trip, an event, a one-on-one tab — completely
            isolated. What you owe a friend on a personal split never mixes with what a whole
            group owes each other, even if it&rsquo;s the same two people. Settling up raises your
            rank; nothing about the app ever pushes it back down.
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <GlassCard className="space-y-2 p-5">
            <h2 className="font-display text-sm font-medium text-ink">Contact us</h2>
            <p className="text-sm text-ink-soft">
              Questions, bug reports, or ideas — reach out any time at{" "}
              <a href="mailto:hello@geldflow.app" className="text-accent-strong underline underline-offset-2">
                hello@geldflow.app
              </a>
              .
            </p>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-display text-sm font-medium text-ink">Send feedback</h2>
            {status_ === "sent" ? (
              <p className="text-sm text-owed">Thanks — we read every message.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What's working, what's not, what would make this better?"
                  className="w-full resize-none rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {error && <p className="text-sm text-owes">{error}</p>}
                <button
                  type="submit"
                  disabled={status_ === "sending"}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95 disabled:opacity-60"
                >
                  {status_ === "sending" ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </GlassCard>
        </Reveal>
      </div>
    </AppShell>
  );
}
