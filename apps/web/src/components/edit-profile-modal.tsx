"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import { updateProfile } from "@/lib/api";

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const USERNAME_COOLDOWN_DAYS = 14;

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, authFetch, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const daysSinceChange = user?.usernameChangedAt
    ? (now - new Date(user.usernameChangedAt).getTime()) / (24 * 60 * 60 * 1000)
    : Infinity;
  const usernameLocked = daysSinceChange < USERNAME_COOLDOWN_DAYS;
  const daysUntilUnlocked = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSinceChange);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await updateProfile(authFetch, {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        avatarUrl: avatarUrl.trim() || null,
      });
      updateUser(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <GlassCard
        className="w-full max-w-sm space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold text-ink">Edit profile</h2>

        <div className="flex justify-center">
          {avatarUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL, next/image can't optimize it
            <img
              src={avatarUrl.trim()}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent font-mono text-lg font-semibold text-on-accent">
              {initials(name)}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Name</span>
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Username</span>
            <div
              className={`flex items-center rounded-lg border border-surface-border bg-bg px-3 focus-within:ring-2 focus-within:ring-ring ${
                usernameLocked ? "opacity-60" : ""
              }`}
            >
              <span className="text-sm text-ink-soft">@</span>
              <input
                required
                disabled={usernameLocked}
                minLength={3}
                maxLength={20}
                pattern="[a-z][a-z0-9_]{2,19}"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-transparent py-2 pl-1 text-sm text-ink outline-none disabled:cursor-not-allowed"
              />
            </div>
            <span className="block text-[11px] text-ink-soft">
              {usernameLocked
                ? `You can change your username again in ${daysUntilUnlocked} day${daysUntilUnlocked === 1 ? "" : "s"}.`
                : "Lowercase letters, numbers, underscores — starts with a letter. Can be changed once every 14 days."}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">
              Avatar URL <span className="text-ink-soft/70">(optional)</span>
            </span>
            <input
              type="url"
              placeholder="https://…"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {error && <p className="text-sm text-owes">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>,
    document.body,
  );
}
