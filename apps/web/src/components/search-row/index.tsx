"use client";

import type { ReactNode } from "react";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  sortLabel: string;
  onSortToggle: () => void;
  filtersTrigger?: ReactNode;
}

export const SearchRow = ({
  search,
  onSearchChange,
  sortLabel,
  onSortToggle,
  filtersTrigger,
}: Props) => (
  <div className="grid grid-cols-[1fr_auto_auto] border-b border-rule sticky z-10 bg-paper top-(--header-height)">
    <input
      type="text"
      placeholder="SEARCH REGISTRY (PROMPT, TAG, OR ID)..."
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      className="w-full border-0 bg-transparent px-6 py-5 font-mono text-sm tracking-widest uppercase text-ink"
    />
    {filtersTrigger ?? (
      <button className="border-0 border-l border-rule bg-transparent px-6 font-mono text-[11px] tracking-[.14em] uppercase text-ink cursor-pointer">
        Filters
      </button>
    )}
    <button
      onClick={onSortToggle}
      className="border-0 border-l border-rule bg-ink px-6 font-mono text-[11px] tracking-[.14em] uppercase text-paper cursor-pointer"
    >
      Sort: {sortLabel}
    </button>
  </div>
);
