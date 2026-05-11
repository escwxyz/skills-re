"use client";

import { ArrowsDownUpIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NormalizedSkillsBrowseFilters, BrowseSort } from "@/utils/browse";
import { getBrowseSortLabel } from "@/utils/browse";
import { m } from "@/paraglide/messages";

const BROWSE_SORT_OPTIONS: { label: string; value: BrowseSort }[] = [
  { label: m.skills_browse_sort_installs(), value: "downloads-all-time" },
  { label: m.skills_browse_sort_trending(), value: "downloads-trending" },
  { label: m.skills_browse_sort_newest(), value: "newest" },
  { label: m.skills_browse_sort_updated(), value: "updated" },
  { label: m.skills_browse_sort_stars(), value: "stars" },
  { label: m.skills_browse_sort_views(), value: "views" },
];

interface Props {
  filters: Pick<NormalizedSkillsBrowseFilters, "sort">;
}

export const BrowseSortDropdown = ({ filters }: Props) => {
  const navigate = useNavigate();
  const activeSortLabel =
    BROWSE_SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ??
    getBrowseSortLabel(filters.sort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            aria-label={`${m.skills_browse_sort_prefix()} ${activeSortLabel}`}
            className="h-full w-(--header-height) rounded-none border-l border-border bg-transparent text-ink hover:bg-muted hover:text-ink"
            size="icon-sm"
            type="button"
            variant="ghost"
            {...props}
          >
            <ArrowsDownUpIcon />
          </Button>
        )}
      />

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            navigate({
              search: (prev) => ({
                ...prev,
                sort: value as NormalizedSkillsBrowseFilters["sort"],
              }),
              to: "/skills",
            });
          }}
          value={filters.sort}
        >
          {BROWSE_SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
