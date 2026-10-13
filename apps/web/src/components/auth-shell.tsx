import type { ReactNode } from "react";
import { GlassCard } from "@/components/glass-card";

/**
 * Staggered entrance via plain CSS (animationDelay), not framer-motion —
 * deliberately. The only place in this app allowed to pull in an
 * animation library is the dynamically-imported marketing landing page;
 * login/signup are real routes someone can land on directly, and if this
 * imported framer-motion directly the bundler hoists it into a chunk
 * shared across every route (confirmed by inspecting the production
 * build), shipping it to the authenticated app too. See
 * no-heavy-animation-in-geld-flow for why that's a hard no here.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="animate-fade-in-up space-y-2 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-14 w-14 rounded-2xl" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "90ms" }}>
          <GlassCard className="overflow-hidden p-6">{children}</GlassCard>
        </div>

        {footer && (
          <p
            className="animate-fade-in-up text-center text-sm text-ink-soft"
            style={{ animationDelay: "220ms" }}
          >
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
