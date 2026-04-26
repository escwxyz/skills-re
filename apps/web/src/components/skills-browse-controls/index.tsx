"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { FadersHorizontalIcon } from "@phosphor-icons/react";
import type { BrowseCategoryItem, BrowseTagItem, SkillsBrowseFilters } from "@/lib/registry-data";
import { buildBrowseUrl } from "@/lib/registry-data";
import { skillsFiltersSidebarOpenAtom } from "@/stores/app";
import { readCookie, writeCookie } from "@/lib/cookies";
import {
  SkillFiltersMobileDrawer,
  SkillFiltersMobileTrigger,
} from "@/components/skill-filters-sidebar/mobile";

const SIDEBAR_COOKIE = "sidebar_state";
const SIDEBAR_MAX_AGE = 60 * 60 * 24 * 7;

interface Props {
  query: string;
  filters: SkillsBrowseFilters;
  categories: BrowseCategoryItem[];
  tags: BrowseTagItem[];
  activeFilterCount: number;
  sortLabel: string;
  nextSortHref: string;
}

function updateSidebarDom(open: boolean) {
  const wrapper: HTMLDivElement | null = document.querySelector("#browse-wrapper");
  if (wrapper) {
    wrapper.dataset.sidebarOpen = String(open);
  }
}

export function SkillsBrowseControls({
  query,
  filters,
  categories,
  tags,
  activeFilterCount,
  sortLabel,
  nextSortHref,
}: Props) {
  const [search, setSearch] = useState(query);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarHydrated, setSidebarHydrated] = useState(false);
  const isSidebarOpen = useStore(skillsFiltersSidebarOpenAtom);

  // On mount: read sidebar cookie and sync DOM
  useEffect(() => {
    const init = async () => {
      const saved = await readCookie(SIDEBAR_COOKIE);
      if (saved === "true" || saved === "false") {
        const next = saved === "true";
        skillsFiltersSidebarOpenAtom.set(next);
        updateSidebarDom(next);
      }
      setSidebarHydrated(true);
    };
    init();
  }, []);

  // Keep DOM + cookie in sync when sidebar state changes
  useEffect(() => {
    if (!sidebarHydrated) {
      return;
    }
    updateSidebarDom(isSidebarOpen);
    writeCookie(SIDEBAR_COOKIE, String(isSidebarOpen), { maxAge: SIDEBAR_MAX_AGE });
  }, [isSidebarOpen, sidebarHydrated]);

  // Keep search input in sync with URL
  useEffect(() => {
    setSearch(query);
  }, [query]);

  // Debounced search navigation
  useEffect(() => {
    const normalized = search.trim();
    if (normalized === filters.query) {
      return;
    }
    const id = window.setTimeout(() => {
      window.location.assign(buildBrowseUrl({ ...filters, page: 1, query: normalized }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [filters, search]);

  return (
    <>
      <div className="grid grid-cols-[1fr_auto_auto_auto] border-b border-rule sticky z-10 bg-paper top-(--header-height)">
        <input
          type="text"
          placeholder="SEARCH REGISTRY (PROMPT, TAG, OR ID)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-0 bg-transparent px-6 py-5 font-mono text-sm tracking-widest uppercase text-ink outline-none"
        />
        {/* Mobile filters trigger */}
        <SkillFiltersMobileTrigger
          onClick={() => setIsMobileOpen(true)}
          activeCount={activeFilterCount}
          className="lg:hidden flex items-center gap-2 border-l border-rule px-6 h-full font-mono text-[11px] tracking-[.14em] uppercase cursor-pointer bg-transparent"
        />
        {/* Desktop sidebar toggle */}
        <button
          type="button"
          onClick={() => skillsFiltersSidebarOpenAtom.set(!isSidebarOpen)}
          aria-expanded={isSidebarOpen}
          aria-controls="skills-sidebar"
          className="hidden lg:flex items-center gap-2 border-l border-rule px-6 h-full font-mono text-[11px] tracking-[.14em] uppercase cursor-pointer bg-transparent"
        >
          <FadersHorizontalIcon />
          Filters
        </button>
        {/* Sort — plain link, pre-computed server-side */}
        <a
          href={nextSortHref}
          className="border-l border-rule bg-ink px-6 font-mono text-[11px] tracking-[.14em] uppercase text-paper flex items-center no-underline"
        >
          Sort: {sortLabel}
        </a>
      </div>

      <SkillFiltersMobileDrawer
        open={isMobileOpen}
        onOpenChange={setIsMobileOpen}
        activeClass={filters.activeClass}
        activeTags={new Set(filters.tags)}
        categories={categories}
        tags={tags}
        onApply={(activeClass, activeTags) => {
          window.location.assign(
            buildBrowseUrl({
              ...filters,
              activeClass,
              page: 1,
              tags: [...activeTags].toSorted(),
            }),
          );
        }}
      />
    </>
  );
}
