"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, checkEmailExists, login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { GoogleLogo } from "@/components/google-logo";

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

function PrefillEmail({ onPrefill }: { onPrefill: (email: string) => void }) {
  const params = useSearchParams();
  const prefill = params.get("email");
  useEffect(() => {
    if (prefill) onPrefill(prefill);
  }, [prefill, onPrefill]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { completeLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noAccountFor, setNoAccountFor] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setNoAccountFor(null);
    setStatus("loading");

    try {
      const exists = await checkEmailExists(email);
      if (!exists) {
        setNoAccountFor(email);
        setStatus("idle");
        return;
      }

      const result = await login(email, password);
      completeLogin(result);
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <AuthShell
      title="Sign in to Geld Flow"
      subtitle="Welcome back — enter your details to continue."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent-strong hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <PrefillEmail onPrefill={setEmail} />
      </Suspense>

      <div className="space-y-5">
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Email</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setNoAccountFor(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-surface-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Password</span>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          </label>

          {noAccountFor && (
            <p className="text-sm text-ink-soft">
              No account found for {noAccountFor}.{" "}
              <Link
                href={`/signup?email=${encodeURIComponent(noAccountFor)}`}
                className="font-medium text-accent-strong hover:underline"
              >
                Create one instead
              </Link>
              .
            </p>
          )}
          {errorMessage && <p className="text-sm text-owes">{errorMessage}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-60"
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
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
    </AuthShell>
  );
}
