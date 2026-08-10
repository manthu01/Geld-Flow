import { PIXEL_ICONS } from "./badge-icons";

const BADGE_COLORS: Record<string, { primary: string; accent: string }> = {
  "first-steps": { primary: "var(--ink-soft)", accent: "var(--ink)" },
  "group-founder": { primary: "var(--accent-2)", accent: "var(--accent-2-strong)" },
  peacemaker: { primary: "var(--owed)", accent: "var(--owed)" },
  "first-settlement": { primary: "var(--accent)", accent: "var(--bg-elevated)" },
  "speedy-settler": { primary: "var(--badge-gold)", accent: "var(--badge-gold)" },
  "reliable-payer": { primary: "var(--owed)", accent: "var(--owed)" },
  legendary: { primary: "var(--badge-gold)", accent: "var(--badge-gold)" },
  "checklist-champion": { primary: "var(--accent-2)", accent: "var(--bg-elevated)" },
};

/**
 * Renders a hand-authored pixel-art grid (see badge-icons.ts) as inline
 * SVG rects — no image assets, crisp at any size. Locked badges render
 * desaturated and faded rather than being hidden, so the badge case
 * reads as a collectible set.
 */
export function PixelBadge({
  iconRef,
  earned,
  size = 40,
  title,
}: {
  iconRef: string;
  earned: boolean;
  size?: number;
  title?: string;
}) {
  const grid = PIXEL_ICONS[iconRef] ?? PIXEL_ICONS["first-steps"];
  const colors = BADGE_COLORS[iconRef] ?? { primary: "var(--accent)", accent: "var(--accent)" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      className={earned ? "" : "opacity-30 grayscale"}
    >
      {title && <title>{title}</title>}
      {grid.map((row, y) =>
        [...row].map((cell, x) => {
          if (cell === ".") return null;
          const fill = cell === "2" ? colors.accent : colors.primary;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
        }),
      )}
    </svg>
  );
}
