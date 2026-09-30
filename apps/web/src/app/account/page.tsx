"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { GlassCard } from "@/components/glass-card";
import { Reveal } from "@/components/motion-primitives";
import { useAuth } from "@/lib/auth-context";
import { CURRENCY_LABELS, SUPPORTED_DISPLAY_CURRENCIES } from "@/lib/currency";
import { changePassword, deleteAccount, submitFeedback, updateProfile } from "@/lib/api";

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function ProfileFields() {
  const { user, authFetch, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency ?? "INR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile(authFetch, {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || null,
        defaultCurrency,
      });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">Full name</span>
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">Email address</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">
          Phone number <span className="text-ink-soft/70">(optional)</span>
        </span>
        <input
          type="tel"
          maxLength={20}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Not set"
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">Default currency</span>
        <select
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SUPPORTED_DISPLAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
        <span className="block text-[11px] text-ink-soft">
          A display preference only — amounts convert for viewing at a fixed rate. Every expense
          keeps the exact amount and currency it was actually logged in, permanently.
        </span>
      </label>

      {error && <p className="text-sm text-owes">{error}</p>}
      {saved && !error && <p className="text-sm text-owed">Saved.</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function PasswordFields() {
  const { user, authFetch } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user?.hasPassword) {
    return (
      <p className="text-sm text-ink-soft">
        This account has no password set yet — sign in with Google, or ask an admin to set one.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await changePassword(authFetch, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">Current password</span>
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">New password</span>
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error && <p className="text-sm text-owes">{error}</p>}
      {saved && !error && <p className="text-sm text-owed">Password updated.</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong disabled:opacity-60"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function AccountPage() {
  const { status, user, authFetch, logout } = useAuth();
  const router = useRouter();

  const [editingPhoto, setEditingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  async function handleFeedbackSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedbackStatus("sending");
    setFeedbackError(null);
    try {
      await submitFeedback(authFetch, message);
      setMessage("");
      setFeedbackStatus("sent");
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Could not send your feedback.");
      setFeedbackStatus("error");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Delete your account? This can't be undone. If you're still part of any shared ledger, your name there becomes just your first name — the ledger and its history stay intact for everyone else.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(authFetch);
      await logout();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete your account.");
      setDeleting(false);
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
          <GlassCard className="space-y-5 p-5">
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
                <p className="truncate font-mono text-xs text-accent-strong">@{user?.username}</p>
                <p className="truncate text-xs text-ink-soft">Photo and username</p>
              </div>
              <button
                onClick={() => setEditingPhoto(true)}
                className="shrink-0 rounded-lg border border-surface-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
              >
                Edit photo & username
              </button>
            </div>

            <div className="border-t border-surface-border pt-4">
              <ProfileFields />
            </div>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="space-y-4 p-5">
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-ink-soft">
              Password
            </h2>
            <PasswordFields />
          </GlassCard>
        </Reveal>

        <Reveal delay={0.15}>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-ink-soft">
              More options
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void logout()}
                className="rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
              >
                Log out
              </button>
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="rounded-lg border border-owes/40 bg-owes/10 px-4 py-2 text-sm font-medium text-owes transition-colors hover:bg-owes/20 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
            {deleteError && <p className="text-sm text-owes">{deleteError}</p>}
          </GlassCard>
        </Reveal>

        <Reveal delay={0.2} className="space-y-2">
          <h2 className="font-display text-lg font-medium">About Geld Flow</h2>
          <p className="text-sm text-ink-soft">
            Geld Flow keeps every ledger — a group trip, an event, a one-on-one tab — completely
            isolated. What you owe a friend on a personal split never mixes with what a whole
            group owes each other, even if it&rsquo;s the same two people. Settling up raises your
            rank; nothing about the app ever pushes it back down.
          </p>
        </Reveal>

        <Reveal delay={0.25}>
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

        <Reveal delay={0.3}>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-display text-sm font-medium text-ink">Rate us</h2>
            <p className="text-sm text-ink-soft">
              Have some opinions about us? We&rsquo;re glad to hear the praise and change the app
              around your needs — tell us what&rsquo;s working and what&rsquo;s not.
            </p>
            {feedbackStatus === "sent" ? (
              <p className="text-sm text-owed">Thanks — we read every message.</p>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What's working, what's not, what would make this better?"
                  className="w-full resize-none rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {feedbackError && <p className="text-sm text-owes">{feedbackError}</p>}
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

      {editingPhoto && <EditProfileModal onClose={() => setEditingPhoto(false)} />}
    </AppShell>
  );
}
