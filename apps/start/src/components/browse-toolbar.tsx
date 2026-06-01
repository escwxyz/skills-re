"use client";

import type { RefObject } from "react";
import { FadersHorizontalIcon } from "@phosphor-icons/react";

import { BrowseSortDropdown } from "@/components/browse-sort-dropdown";
import { SkillsSearchField } from "@/components/skills-search-field";
import type { SkillsSearchMode } from "@/components/skills-search-field";
import { SkillsViewModeToggle } from "@/components/skills-view-mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NormalizedSkillsBrowseFilters } from "@/utils/browse";
import { m } from "@/paraglide/messages";

interface Props {
  activeFilterCount: number;
  filters: NormalizedSkillsBrowseFilters;
  filtersOpen: boolean;
  searchDisabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchModeChange: (value: SkillsSearchMode) => void;
  onSearchSubmit: () => void;
  onToggleFilters: () => void;
  searchMode: SkillsSearchMode;
  searchValue: string;
}

export const BrowseToolbar = ({
  activeFilterCount,
  filters,
  filtersOpen,
  searchDisabled,
  inputRef,
  isSearchMode,
  onClearSearch,
  onSearchChange,
  onSearchFocus,
  onSearchModeChange,
  onSearchSubmit,
  onToggleFilters,
  searchMode,
  searchValue,
}: Props) => (
  <div
    className={cn(
      "bg-background/90 sticky top-(--header-height) z-20 h-(--header-height) backdrop-blur",
      isSearchMode
        ? "grid grid-cols-1"
        : "grid grid-cols-[minmax(0,1fr)_auto] border-b border-border lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]",
    )}
  >
    <SkillsSearchField
      active={isSearchMode}
      disabled={searchDisabled}
      inputRef={inputRef}
      onChange={onSearchChange}
      onClear={onClearSearch}
      onFocus={onSearchFocus}
      onSearchModeChange={onSearchModeChange}
      onSubmit={onSearchSubmit}
      searchMode={searchMode}
      value={searchValue}
    />
    {!isSearchMode && (
      <>
        <Button
          aria-pressed={filtersOpen}
          aria-label={m.skills_browse_controls_filters()}
          className="relative h-full w-(--header-height) rounded-none border-l border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
          onClick={onToggleFilters}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <FadersHorizontalIcon />
          {activeFilterCount > 0 ? (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] leading-none text-background">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <div className="hidden lg:block">
          <BrowseSortDropdown filters={filters} />
        </div>
        <SkillsViewModeToggle className="hidden w-(--header-height) lg:flex" />
      </>
    )}
  </div>
);
