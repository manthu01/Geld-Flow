"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Landing spot after magic-link verification or the Google OAuth
 * callback — both just set the httpOnly refresh cookie and redirect
 * here. AuthProvider already kicks off the session restore on mount, so
 * this page only watches its result rather than triggering a second,
 * redundant refresh call against the same single-use cookie.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    } else if (status === "unauthenticated") {
      router.replace("/login?error=invalid_link");
    }
  }, [status, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      <p className="text-sm text-ink-soft">Signing you in…</p>
    </main>
  );
}
