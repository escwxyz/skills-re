"use client";

import { SkillsViewModeToggle } from "@/components/skills-view-mode-toggle";

interface Props {
  from: number;
  to: number;
  hasNextPage: boolean;
  sortLabel: string;
  totalSkillsLabel: string;
}

export function SkillsStatsRow({ from, to, hasNextPage, sortLabel, totalSkillsLabel }: Props) {
  const hasResults = from > 0 && to >= from;

  return (
    <div className="flex items-center justify-between border-b border-rule px-6 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
      <span>
        {hasResults ? (
          <>
            Showing {from}-{to}
            {hasNextPage ? "+" : ""} of <b className="text-ink">{totalSkillsLabel}</b> skills —
            sorted by {sortLabel}
          </>
        ) : (
          <>
            Showing <b className="text-ink">0</b> skills — sorted by {sortLabel}
          </>
        )}
      </span>
      <SkillsViewModeToggle className="hidden md:block" />
    </div>
  );
}
