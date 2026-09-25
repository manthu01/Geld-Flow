import type { ReactNode } from "react";

/**
 * These used to be Framer Motion wrappers (fade/slide/stagger reveals, an
 * animated route-transition curtain, spring-driven numbers). They made
 * every navigation and list render feel sluggish — the app's whole point
 * is logging a transaction fast, and the animation layer was directly at
 * odds with that. Kept as plain, static pass-throughs (same props, same
 * call sites, zero behavior) rather than ripping them out of every
 * caller, so this stays a one-file change.
 */

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function StaggerGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** Swaps content immediately — no crossfade. */
export function FadeSwap({
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/** Renders the plain formatted number — no count-up. */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return <>{value.toFixed(decimals)}</>;
}

/** Renders the current route's content directly — no transition, no forced remount on navigation. */
export function PageTransition({ children }: { routeKey: string; children: ReactNode }) {
  return <>{children}</>;
}
