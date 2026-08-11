"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { API_URL, requestMagicLink } from "@/lib/api";

function LoginError() {
  const params = useSearchParams();
  if (params.get("error") !== "invalid_link") return null;
  return (
    <p className="text-sm text-owes">
      That link is invalid or has expired. Request a new one below.
    </p>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    try {
      const result = await requestMagicLink(email);
      setDevLink(result.devLink ?? null);
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-14 w-14 rounded-2xl" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in to Geld Flow
          </h1>
          <p className="text-sm text-ink-soft">
            No password needed — we&rsquo;ll email you a link.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginError />
        </Suspense>

        <GlassCard className="p-6 space-y-5">
          {status === "sent" ? (
            <div className="space-y-3 text-sm">
              <p>
                Check <span className="font-medium text-ink">{email}</span> for a
                sign-in link.
              </p>
              {devLink && (
                <a
                  href={devLink}
                  className="block break-all text-xs text-accent-strong underline underline-offset-2"
                >
                  Dev mode: open the link directly ({devLink})
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-wide text-ink-soft">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-surface-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              {errorMessage && <p className="text-sm text-owes">{errorMessage}</p>}
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-surface-border" />
            or
            <span className="h-px flex-1 bg-surface-border" />
          </div>

          <a
            href={`${API_URL}/auth/google`}
            className="flex w-full items-center justify-center rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-surface-strong active:scale-95"
          >
            Continue with Google
          </a>
        </GlassCard>
      </div>
    </main>
  );
}
