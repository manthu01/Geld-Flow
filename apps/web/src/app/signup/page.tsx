"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, checkEmailExists, login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { GoogleLogo } from "@/components/google-logo";

function PrefillEmail({ onPrefill }: { onPrefill: (email: string) => void }) {
  const params = useSearchParams();
  const prefill = params.get("email");
  useEffect(() => {
    if (prefill) onPrefill(prefill);
  }, [prefill, onPrefill]);
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const { completeLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAccountFor, setHasAccountFor] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setHasAccountFor(null);

    if (password !== confirmPassword) {
      setErrorMessage("Those passwords don't match.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setHasAccountFor(email);
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
      title="Create your account"
      subtitle="Set a password to get started with Ledgr."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-strong hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <PrefillEmail onPrefill={setEmail} />
      </Suspense>

      <div className="space-y-5">
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
                setHasAccountFor(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-surface-border bg-bg-elevated px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Password</span>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            <span className="block text-xs text-ink-soft">At least 8 characters.</span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-soft">Confirm password</span>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          </label>

          {hasAccountFor && (
            <p className="text-sm text-ink-soft">
              An account already exists for {hasAccountFor}.{" "}
              <Link
                href={`/login?email=${encodeURIComponent(hasAccountFor)}`}
                className="font-medium text-accent-strong hover:underline"
              >
                Sign in instead
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
            {status === "loading" ? "Creating account…" : "Create account"}
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
