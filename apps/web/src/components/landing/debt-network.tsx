"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

type Point = [number, number];

/** Scattered, tangled starting layout — the mess a group's tab actually looks like. */
const MESSY: Point[] = [
  [130, 140],
  [340, 70],
  [520, 160],
  [680, 110],
  [230, 370],
  [590, 380],
];

/** Settled layout: an even circle, the shape debt simplification resolves everything into. */
const CLEAN: Point[] = (() => {
  const cx = 400;
  const cy = 240;
  const r = 170;
  return [-90, -30, 30, 90, 150, 210].map((deg): Point => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  });
})();

/** Tangled many-to-many debts — fades out as the scroll resolves them. */
const MESSY_EDGES: { d: string; color: "owed" | "owes" }[] = [
  { d: "M130,140 Q260,40 340,70", color: "owes" },
  { d: "M340,70 Q450,20 520,160", color: "owed" },
  { d: "M520,160 Q620,60 680,110", color: "owes" },
  { d: "M130,140 Q180,280 230,370", color: "owed" },
  { d: "M230,370 Q420,330 590,380", color: "owes" },
  { d: "M590,380 Q660,250 680,110", color: "owed" },
  { d: "M340,70 Q300,250 230,370", color: "owes" },
  { d: "M520,160 Q400,280 590,380", color: "owed" },
  { d: "M130,140 Q380,180 520,160", color: "owes" },
  { d: "M340,70 Q560,220 680,110", color: "owed" },
];

/** The payoff: the fewest transfers that settle everyone up. */
const CLEAN_EDGES: { from: Point; to: Point }[] = [
  { from: CLEAN[0], to: CLEAN[3] },
  { from: CLEAN[1], to: CLEAN[4] },
  { from: CLEAN[2], to: CLEAN[5] },
  { from: CLEAN[5], to: CLEAN[0] },
];

export function DebtNetwork() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const messyOpacity = useTransform(scrollYProgress, [0, 0.42], [1, 0]);
  const cleanOpacity = useTransform(scrollYProgress, [0.45, 0.8], [0, 1]);
  const cleanDash = useTransform(scrollYProgress, [0.45, 0.85], [0, 1]);
  const captionBefore = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const captionAfter = useTransform(scrollYProgress, [0.6, 0.85], [0, 1]);

  if (prefersReducedMotion) {
    return (
      <div className="py-24">
        <StaticSettledGraph />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="relative w-full max-w-3xl">
          <motion.p
            style={{ opacity: captionBefore }}
            className="absolute -top-16 left-1/2 w-full -translate-x-1/2 text-center font-display text-xl font-semibold text-ink sm:text-2xl"
          >
            Everyone&rsquo;s tab gets tangled.
          </motion.p>
          <motion.p
            style={{ opacity: captionAfter }}
            className="absolute -top-16 left-1/2 w-full -translate-x-1/2 text-center font-display text-xl font-semibold text-accent-strong sm:text-2xl"
          >
            Flow finds the fewest payments.
          </motion.p>

          <svg viewBox="0 0 800 480" className="h-auto w-full">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="8"
                refX="9"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L10,4 L0,8 Z" fill="var(--accent)" />
              </marker>
            </defs>

            <motion.g style={{ opacity: messyOpacity }}>
              {MESSY_EDGES.map((edge, i) => (
                <path
                  key={i}
                  d={edge.d}
                  fill="none"
                  stroke={edge.color === "owes" ? "var(--owes)" : "var(--owed)"}
                  strokeWidth={1.5}
                  strokeOpacity={0.45}
                />
              ))}
              {MESSY.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={7} fill="var(--ink-soft)" />
              ))}
            </motion.g>

            <motion.g style={{ opacity: cleanOpacity }}>
              {CLEAN_EDGES.map((edge, i) => (
                <motion.line
                  key={i}
                  x1={edge.from[0]}
                  y1={edge.from[1]}
                  x2={edge.to[0]}
                  y2={edge.to[1]}
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  markerEnd="url(#arrowhead)"
                  style={{ pathLength: cleanDash }}
                />
              ))}
              {CLEAN.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={9} fill="var(--accent-strong)" />
              ))}
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
}

function StaticSettledGraph() {
  return (
    <svg viewBox="0 0 800 480" className="mx-auto h-auto w-full max-w-3xl">
      <defs>
        <marker id="arrowhead-static" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
          <path d="M0,0 L10,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>
      {CLEAN_EDGES.map((edge, i) => (
        <line
          key={i}
          x1={edge.from[0]}
          y1={edge.from[1]}
          x2={edge.to[0]}
          y2={edge.to[1]}
          stroke="var(--accent)"
          strokeWidth={2.5}
          markerEnd="url(#arrowhead-static)"
        />
      ))}
      {CLEAN.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill="var(--accent-strong)" />
      ))}
    </svg>
  );
}
