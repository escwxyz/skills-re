"use client";

import { AnimatePresence, motion } from "motion/react";

export const SearchFocusBackdrop = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active ? (
      <motion.div
        aria-hidden
        animate={{ opacity: 1 }}
        className="pointer-events-none fixed inset-0 z-10 bg-background/55 backdrop-blur-[6px]"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
    ) : null}
  </AnimatePresence>
);
