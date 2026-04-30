"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import type {
  BrowseCategoryItem,
  BrowseSkillItem,
  BrowseSort,
  BrowseTagItem,
  SkillsBrowseFilters,
} from "@/lib/registry-data";
import { DEFAULT_BROWSE_SORT } from "@/lib/registry-data";
import { skillsFiltersSidebarOpenAtom, skillsViewModeAtom } from "@/stores/app";
import { SkillsCategoriesBar } from "@/components/skills-categories-bar";
import { SkillFiltersSidebar } from "@/components/skill-filters-sidebar";
import {
  SkillFiltersMobileDrawer,
  SkillFiltersMobileTrigger,
} from "@/components/skill-filters-sidebar/mobile";
import { SearchRow } from "@/components/search-row";
import { SkillGrid } from "@/components/skill-grid";
import { SkillsStatsRow } from "@/components/skills-stats-row";
import { SkillList } from "@/components/skill-list";
import { SkillsPagination } from "@/components/skills-pagination";
import { FadersHorizontalIcon } from "@phosphor-icons/react";
import { readCookie, writeCookie } from "@/lib/cookies";

const TRIGGER_CLS =
  "flex items-center gap-2 border-l border-rule px-6 h-full font-mono text-[11px] tracking-[.14em] uppercase cursor-pointer bg-transparent";
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SORT_SEQUENCE: BrowseSort[] = [
  "downloads-all-time",
  "downloads-trending",
  "newest",
  "updated",
  "stars",
  "views",
];

// const getBrowseSortLabel = (sort: BrowseSort) => {
//   switch (sort) {
//     case "downloads-trending": {
//       return "Trending";
//     }
//     case "newest": {
//       return "Newest";
//     }
//     case "stars": {
//       return "Stars";
//     }
//     case "updated": {
//       return "Updated";
//     }
//     case "views": {
//       return "Views";
//     }
//     default: {
//       return "Installs";
//     }
//   }
// };

const buildBrowseUrl = (filters: SkillsBrowseFilters) => {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.activeClass !== "all") {
    params.set("category", filters.activeClass);
  }
  for (const tag of filters.tags) {
    params.append("tag", tag);
  }
  if (filters.sort !== DEFAULT_BROWSE_SORT) {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const queryString = params.toString();
  return queryString ? `/skills?${queryString}` : "/skills";
};

function DesktopFiltersTrigger() {
  const isSidebarOpen = useStore(skillsFiltersSidebarOpenAtom);

  return (
    <button
      type="button"
      onClick={() => skillsFiltersSidebarOpenAtom.set(!isSidebarOpen)}
      className={`hidden lg:flex ${TRIGGER_CLS}`}
    >
      <FadersHorizontalIcon />
      Filters
    </button>
  );
}

interface Props {
  categories: BrowseCategoryItem[];
  filters: SkillsBrowseFilters;
  hasNextPage: boolean;
  rangeEnd: number;
  rangeStart: number;
  skills: BrowseSkillItem[];
  sortLabel: string;
  tags: BrowseTagItem[];
  totalSkillsLabel: string;
}

export function SkillsPage({
  categories,
  filters,
  hasNextPage,
  rangeEnd,
  rangeStart,
  skills,
  sortLabel,
  tags,
  totalSkillsLabel,
}: Props) {
  const view = useStore(skillsViewModeAtom);
  const isSidebarOpen = useStore(skillsFiltersSidebarOpenAtom);
  const [search, setSearch] = useState(filters.query);
  const [sidebarCookieHydrated, setSidebarCookieHydrated] = useState(false);
  const activeTags = useMemo(() => new Set(filters.tags), [filters.tags]);

  useEffect(() => {
    const run = async () => {
      const savedSidebarState = await readCookie(SIDEBAR_COOKIE_NAME);
      if (savedSidebarState === "true" || savedSidebarState === "false") {
        skillsFiltersSidebarOpenAtom.set(savedSidebarState === "true");
      }
      setSidebarCookieHydrated(true);
    };
    run();
  }, []);

  useEffect(() => {
    if (!sidebarCookieHydrated) {
      return;
    }

    writeCookie(SIDEBAR_COOKIE_NAME, String(isSidebarOpen), {
      maxAge: SIDEBAR_COOKIE_MAX_AGE,
    });
  }, [isSidebarOpen, sidebarCookieHydrated]);

  useEffect(() => {
    setSearch(filters.query);
  }, [filters.query]);

  const navigate = (nextFilters: SkillsBrowseFilters) => {
    const nextUrl = buildBrowseUrl(nextFilters);
    if (window.location.pathname + window.location.search === nextUrl) {
      return;
    }

    window.location.assign(nextUrl);
  };

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch === filters.query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate({
        ...filters,
        page: 1,
        query: normalizedSearch,
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, search]);

  const toggleTag = (tag: string) => {
    const nextTags = new Set(activeTags);
    if (nextTags.has(tag)) {
      nextTags.delete(tag);
    } else {
      nextTags.add(tag);
    }

    navigate({
      ...filters,
      page: 1,
      tags: [...nextTags].toSorted(),
    });
  };

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const activeFilterCount = (filters.activeClass === "all" ? 0 : 1) + activeTags.size;

  const applyMobileFilters = (newClass: string, newTags: Set<string>) => {
    navigate({
      ...filters,
      activeClass: newClass,
      page: 1,
      tags: [...newTags].toSorted(),
    });
  };

  const toggleSort = () => {
    const currentIndex = SORT_SEQUENCE.indexOf(filters.sort);
    const nextSort =
      currentIndex === -1
        ? DEFAULT_BROWSE_SORT
        : SORT_SEQUENCE[(currentIndex + 1) % SORT_SEQUENCE.length];

    navigate({
      ...filters,
      page: 1,
      sort: nextSort,
    });
  };

  const prevHref = filters.page > 1 ? buildBrowseUrl({ ...filters, page: filters.page - 1 }) : null;
  const nextHref = hasNextPage ? buildBrowseUrl({ ...filters, page: filters.page + 1 }) : null;

  return (
    <div className="flex items-start">
      {isSidebarOpen ? (
        <SkillFiltersSidebar
          activeClass={filters.activeClass}
          categories={categories}
          onClassChange={(nextClass) =>
            navigate({
              ...filters,
              activeClass: nextClass,
              page: 1,
            })
          }
          activeTags={activeTags}
          tags={tags}
          onTagToggle={toggleTag}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <SkillsCategoriesBar
          activeClass={filters.activeClass}
          categories={categories}
          onClassChange={(nextClass) =>
            navigate({
              ...filters,
              activeClass: nextClass,
              page: 1,
            })
          }
        />

        <SearchRow
          search={search}
          onSearchChange={setSearch}
          sortLabel={sortLabel}
          onSortToggle={toggleSort}
          filtersTrigger={
            <>
              <DesktopFiltersTrigger />
              <SkillFiltersMobileTrigger
                className={`lg:hidden ${TRIGGER_CLS}`}
                onClick={() => setIsMobileFiltersOpen(true)}
                activeCount={activeFilterCount}
              />
            </>
          }
        />

        <SkillFiltersMobileDrawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          activeClass={filters.activeClass}
          activeTags={activeTags}
          categories={categories}
          tags={tags}
          onApply={applyMobileFilters}
        />

        <SkillsStatsRow
          from={rangeStart}
          to={rangeEnd}
          hasNextPage={hasNextPage}
          sortLabel={sortLabel}
          totalSkillsLabel={totalSkillsLabel}
        />

        {view === "grid" ? <SkillGrid skills={skills} /> : null}
        {view === "list" ? <SkillList skills={skills} /> : null}

        <SkillsPagination currentPage={filters.page} nextHref={nextHref} prevHref={prevHref} />
      </div>
    </div>
  );
}
