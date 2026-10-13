import type { ReactNode } from "react";
import { GlassCard } from "@/components/glass-card";

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
      <div className="animate-fade-in-up w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/geld-flow-icon.jpg" alt="Geld Flow" className="h-14 w-14 rounded-2xl" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>

        <GlassCard className="overflow-hidden p-6">{children}</GlassCard>

        {footer && <p className="text-center text-sm text-ink-soft">{footer}</p>}
      </div>
    </main>
  );
}
