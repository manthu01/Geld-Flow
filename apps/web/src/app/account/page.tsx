"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { GlassCard } from "@/components/glass-card";
import { Reveal } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { submitFeedback } from "@/lib/api";

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export default function AccountPage() {
  const { status, user, authFetch, logout } = useAuth();
  const router = useRouter();

  const [editingProfile, setEditingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedbackStatus("sending");
    setError(null);
    try {
      await submitFeedback(authFetch, message);
      setMessage("");
      setFeedbackStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your feedback.");
      setFeedbackStatus("error");
    }
  }

  return (
    <AppShell>
      <div className="w-full max-w-3xl space-y-8">
        <Reveal className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Account</h1>
          <p className="text-sm text-ink-soft">Your profile, and a few things about Geld Flow.</p>
        </Reveal>

        <Reveal delay={0.05}>
          <GlassCard className="space-y-4 p-5">
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-ink-soft">
              Your profile
            </h2>
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL, next/image can't optimize it
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-lg font-semibold text-on-accent">
                  {initials(user?.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{user?.name}</p>
                <p className="truncate font-mono text-xs text-accent-strong">@{user?.username}</p>
                <p className="truncate text-xs text-ink-soft">{user?.email}</p>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className="shrink-0 rounded-lg border border-surface-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
              >
                Edit profile
              </button>
            </div>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-ink-soft">
              More options
            </h2>
            <button
              onClick={() => void logout()}
              className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
            >
              Log out
            </button>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.15} className="space-y-2">
          <h2 className="font-display text-lg font-medium">About Geld Flow</h2>
          <p className="text-sm text-ink-soft">
            Geld Flow keeps every ledger — a group trip, an event, a one-on-one tab — completely
            isolated. What you owe a friend on a personal split never mixes with what a whole
            group owes each other, even if it&rsquo;s the same two people. Settling up raises your
            rank; nothing about the app ever pushes it back down.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
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

        <Reveal delay={0.25}>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-display text-sm font-medium text-ink">Rate us</h2>
            <p className="text-sm text-ink-soft">
              Have some opinions about us? We&rsquo;re glad to hear the praise and change the app
              around your needs — tell us what&rsquo;s working and what&rsquo;s not.
            </p>
            {feedbackStatus === "sent" ? (
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
                  disabled={feedbackStatus === "sending"}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong active:scale-95 disabled:opacity-60"
                >
                  {feedbackStatus === "sending" ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </GlassCard>
        </Reveal>
      </div>

      {editingProfile && <EditProfileModal onClose={() => setEditingProfile(false)} />}
    </AppShell>
  );
}
