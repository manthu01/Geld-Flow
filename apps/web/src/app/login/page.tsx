"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { GlassCard } from "@/components/glass-card";
import { FadeSwap, Reveal } from "@/components/motion-primitives";
import { API_URL, requestMagicLink } from "@/lib/api";

function LoginError() {
  const params = useSearchParams();
  if (params.get("error") !== "invalid_link") return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-owes/30 bg-owes/10 px-3 py-2 text-sm text-owes">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      That link is invalid or has expired. Request a new one below.
    </div>
  );
}

function CheckmarkBurst() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-owed/15 text-owed"
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      >
        <motion.path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
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
      <Reveal className="w-full max-w-sm space-y-6">
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

        <GlassCard className="overflow-hidden p-6">
          <FadeSwap id={status === "sent" ? "sent" : "form"}>
            {status === "sent" ? (
              <div className="space-y-4 text-center">
                <CheckmarkBurst />
                <div className="space-y-1">
                  <p className="text-sm text-ink">
                    Check <span className="font-medium">{email}</span> for a sign-in
                    link.
                  </p>
                  <p className="text-xs text-ink-soft">
                    It&rsquo;ll expire in 15 minutes — keep this tab open.
                  </p>
                </div>

                {devLink && (
                  <div className="space-y-1.5 rounded-lg border border-dashed border-surface-border bg-bg px-3 py-2.5 text-left">
                    <span className="inline-block rounded-full bg-accent-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent-strong">
                      Dev mode
                    </span>
                    <a
                      href={devLink}
                      className="block break-all font-mono text-[11px] leading-relaxed text-accent-strong underline underline-offset-2"
                    >
                      {devLink}
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setDevLink(null);
                  }}
                  className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <div className="space-y-5">
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

                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  <span className="h-px flex-1 bg-surface-border" />
                  or
                  <span className="h-px flex-1 bg-surface-border" />
                </div>

                <a
                  href={`${API_URL}/auth/google`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-bg-elevated px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-surface-strong active:scale-95"
                >
                  <GoogleLogo />
                  Continue with Google
                </a>
              </div>
            )}
          </FadeSwap>
        </GlassCard>
      </Reveal>
    </main>
  );
}
