import type { ComponentPropsWithoutRef } from "react";

type GlassCardProps = {
  /** Adds hover/focus lift — use for cards that are themselves clickable. */
  interactive?: boolean;
} & ComponentPropsWithoutRef<"div">;

/**
 * The base glassmorphic surface every expense card, modal, and panel in
 * the product builds on. Backdrop-blur needs a non-flat backdrop behind it
 * to actually read as "glass" — plain-color pages will render the effect
 * as a faint tint, which is expected until Phase 4's layered backgrounds
 * land.
 */
export function GlassCard({
  interactive = false,
  className = "",
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-surface-border bg-surface backdrop-blur-xl",
        "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.35)]",
        interactive &&
          "transition-[transform,background-color] duration-200 ease-out hover:bg-surface-strong hover:-translate-y-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
