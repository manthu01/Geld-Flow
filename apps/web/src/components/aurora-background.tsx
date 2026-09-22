"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

const POINTER_SPRING = { stiffness: 40, damping: 20, mass: 1 };

/**
 * Fixed decorative backdrop — three slow-drifting blurred gradient blobs
 * (the drift itself is pure CSS, see globals.css) mounted once in the
 * root layout so every page's glass surfaces have something non-flat
 * behind them to blur. On top of that drift, each blob also drifts
 * slightly toward the cursor at a different depth/speed — a subtle
 * parallax so the background reads as alive rather than a static image,
 * without ever competing with foreground content. Skipped entirely for
 * reduced-motion users.
 */
export function AuroraBackground() {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, POINTER_SPRING);
  const springY = useSpring(pointerY, POINTER_SPRING);

  const x1 = useTransform(springX, (v) => v * 18);
  const y1 = useTransform(springY, (v) => v * 14);
  const x2 = useTransform(springX, (v) => v * -22);
  const y2 = useTransform(springY, (v) => v * -16);
  const x3 = useTransform(springX, (v) => v * 12);
  const y3 = useTransform(springY, (v) => v * -10);

  useEffect(() => {
    if (reduce) return;
    function onPointerMove(event: PointerEvent) {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reduce, pointerX, pointerY]);

  return (
    <div className="aurora" aria-hidden="true">
      <motion.div className="aurora__layer" style={reduce ? undefined : { x: x1, y: y1 }}>
        <div className="aurora__blob aurora__blob--1" />
      </motion.div>
      <motion.div className="aurora__layer" style={reduce ? undefined : { x: x2, y: y2 }}>
        <div className="aurora__blob aurora__blob--2" />
      </motion.div>
      <motion.div className="aurora__layer" style={reduce ? undefined : { x: x3, y: y3 }}>
        <div className="aurora__blob aurora__blob--3" />
      </motion.div>
    </div>
  );
}
