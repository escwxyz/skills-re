"use client";

import type { RefObject } from "react";
import { FadersHorizontalIcon } from "@phosphor-icons/react";

import { BrowseSortDropdown } from "@/components/browse-sort-dropdown";
import { SkillsSearchField } from "@/components/skills-search-field";
import { SkillsViewModeToggle } from "@/components/skills-view-mode-toggle";
import { Button } from "@/components/ui/button";
import type { NormalizedSkillsBrowseFilters } from "@/utils/browse";
import { m } from "@/paraglide/messages";

interface Props {
  activeFilterCount: number;
  filters: NormalizedSkillsBrowseFilters;
  filtersOpen: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  isSearchMode: boolean;
  isSearching?: boolean;
  onClearSearch: () => void;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchSubmit: () => void;
  onToggleFilters: () => void;
  searchValue: string;
}

export const BrowseToolbar = ({
  activeFilterCount,
  filters,
  filtersOpen,
  inputRef,
  isSearchMode,
  isSearching,
  onClearSearch,
  onSearchChange,
  onSearchFocus,
  onSearchSubmit,
  onToggleFilters,
  searchValue,
}: Props) => (
  <div className="sticky top-(--header-height) z-20 grid h-(--header-height) grid-cols-[minmax(0,1fr)_auto_auto] border-b border-border bg-paper/95 backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
    <SkillsSearchField
      active={isSearchMode}
      inputRef={inputRef}
      isSearching={isSearching}
      onChange={onSearchChange}
      onClear={onClearSearch}
      onFocus={onSearchFocus}
      onSubmit={onSearchSubmit}
      value={searchValue}
    />
    {isSearchMode ? (
      <div className="hidden h-full items-center border-l border-border px-4 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text lg:flex">
        Relevance
      </div>
    ) : (
      <>
        <Button
          aria-pressed={filtersOpen}
          aria-label={m.skills_browse_controls_filters()}
          className="relative h-full w-(--header-height) rounded-none border-l border-border bg-transparent text-ink hover:bg-muted hover:text-ink"
          onClick={onToggleFilters}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <FadersHorizontalIcon />
          {activeFilterCount > 0 ? (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-ink text-[9px] leading-none text-paper">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <div className="hidden lg:block">
          <BrowseSortDropdown filters={filters} />
        </div>
      </>
    )}
    <SkillsViewModeToggle className="hidden w-(--header-height) lg:flex" />
  </div>
);
