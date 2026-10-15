"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence, MotionConfig } from "framer-motion";
import { DebtNetwork } from "./debt-network";

const FEATURES = [
  {
    title: "Groups",
    body: "Trips, tabs, and long-running shared expenses — tracked together, settled with the fewest payments.",
  },
  {
    title: "Friends",
    body: "One real number per person: what you actually owe or are owed, across every ledger you share.",
  },
  {
    title: "Activity",
    body: "Every expense, settlement, and edit — who did what, in order, with mutual-consent deletion built in.",
  },
];

function IntroOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1300);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onClick={onDone}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 bg-bg"
    >
      <motion.img
        src="/ledgr-icon.png"
        alt="Ledgr"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-16 w-16 rounded-2xl"
      />
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft"
      >
        Simplifying your tab…
      </motion.p>
    </motion.div>
  );
}

export function MarketingPage() {
  const prefersReducedMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {!introDone && !prefersReducedMotion && (
          <IntroOverlay onDone={() => setIntroDone(true)} />
        )}
      </AnimatePresence>

      <main className="flex flex-1 flex-col">
        {/* ---------------------------------------------------------- Hero */}
        <section className="flex flex-col items-center justify-center px-6 pb-20 pt-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="flex justify-center pb-5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static local asset, next/image is overkill here */}
            <img src="/ledgr-icon.png" alt="Ledgr" className="h-16 w-16 rounded-2xl" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-ink-soft"
          >
            Ledgr
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-6xl"
          >
            Split the mess.
            <br />
            <span className="text-accent-strong">Find the flow.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 max-w-md text-sm text-ink-soft sm:text-base"
          >
            Trips, tabs, and everything in between — without the spreadsheet,
            and without the ten-way account statement nobody wants to read.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-surface-border bg-bg-elevated px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-strong"
            >
              Sign in
            </Link>
          </motion.div>
        </section>

        {/* ----------------------------------------------- Debt-network story */}
        <DebtNetwork />

        {/* --------------------------------------------------------- Features */}
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-28 pt-8 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-surface-border bg-surface p-6 backdrop-blur-xl"
            >
              <h3 className="font-display text-lg font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{feature.body}</p>
            </motion.div>
          ))}
        </section>

        {/* ------------------------------------------------------- Closing CTA */}
        <section className="flex flex-col items-center justify-center gap-6 px-6 pb-28 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Ready to settle up?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
            >
              Create an account
            </Link>
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  );
}
