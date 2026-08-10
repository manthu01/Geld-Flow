"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import { createTelegramLinkCode, getTelegramStatus } from "@/lib/api";

export function TelegramConnect({ ledgerId }: { ledgerId: string }) {
  const { authFetch } = useAuth();
  const [configured, setConfigured] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getTelegramStatus(authFetch);
      setConfigured(status.configured);
      setBotUsername(status.botUsername);
    } catch {
      setConfigured(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // Data fetch on mount, not a render-loop synchronization — the rule's
    // false-positive case for this pattern (see auth-context.tsx history).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkStatus();
  }, [checkStatus]);

  async function handleConnect() {
    setError(null);
    try {
      const result = await createTelegramLinkCode(authFetch, ledgerId);
      setCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a Telegram link code.");
    }
  }

  if (!configured) {
    return null;
  }

  return (
    <section className="space-y-2">
      {!code ? (
        <button
          onClick={handleConnect}
          className="rounded-lg border border-surface-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-strong"
        >
          Connect Telegram
        </button>
      ) : (
        <GlassCard className="space-y-1 p-4 text-sm text-ink">
          <p>
            1. Add{" "}
            {botUsername ? (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong underline underline-offset-2"
              >
                @{botUsername}
              </a>
            ) : (
              "the bot"
            )}{" "}
            to your trip&apos;s Telegram chat.
          </p>
          <p>
            2. Send <span className="font-mono">/link {code}</span> in that chat (expires in 15
            minutes).
          </p>
          <p className="text-xs text-ink-soft">
            Then log expenses right from the chat: “Paid $40 for pizza @Alex”.
          </p>
        </GlassCard>
      )}
      {error && <p className="text-sm text-owes">{error}</p>}
    </section>
  );
}
