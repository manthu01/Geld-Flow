import type { ComponentPropsWithoutRef } from "react";

type GlassCardProps = {
  /** Adds a hover lift — use for cards that are themselves clickable. */
  interactive?: boolean;
  /** Adds an accent-colored glow on hover — reserve for the one or two most important cards on a page. */
  glow?: boolean;
} & ComponentPropsWithoutRef<"div">;

/**
 * The base glassmorphic surface every expense card, modal, and panel in
 * the product builds on. Backdrop-blur needs a non-flat backdrop behind it
 * to actually read as "glass" — see <AuroraBackground>, mounted once in
 * the root layout so this never renders as a flat tint.
 */
export function GlassCard({
  interactive = false,
  glow = false,
  className = "",
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-surface-border bg-surface backdrop-blur-xl backdrop-saturate-150",
        "shadow-[inset_0_1px_0_0_var(--surface-highlight),var(--glass-shadow)]",
        interactive &&
          "cursor-pointer transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[color:var(--accent-tint)] hover:bg-surface-strong",
        interactive &&
          !glow &&
          "hover:shadow-[inset_0_1px_0_0_var(--surface-highlight),0_16px_40px_-20px_rgba(0,0,0,0.55)]",
        interactive &&
          glow &&
          "hover:shadow-[inset_0_1px_0_0_var(--surface-highlight),0_0_0_1px_var(--accent-tint),0_24px_64px_-20px_var(--accent-tint)]",
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
