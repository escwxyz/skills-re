"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

export const SearchFocusBackdrop = ({
  active,
  onClick,
}: {
  active: boolean;
  onClick?: () => void;
}) => (
  <AnimatePresence>
    {active ? (
      <motion.div
        aria-hidden
        animate={{ opacity: 1 }}
        className={cn(
          "fixed inset-0 z-10 bg-background/55 backdrop-blur-[6px]",
          onClick ? "cursor-pointer" : "pointer-events-none",
        )}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={onClick}
      />
    ) : null}
  </AnimatePresence>
);
