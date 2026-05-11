"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { skillsViewModeAtom } from "@/atoms/app";
import { BrowseSkillList } from "@/components/browse-skill-list";
import { LoadMore } from "@/components/load-more";
import { SkillCardBrowse } from "@/components/skill-card-browse";
import { getSkillsBrowseInitialPage } from "@/functions/skills/get-skills-browse-initial-page";
import { getSkillsBrowsePagination } from "@/functions/skills/get-skills-browse-pagination";
import type { NormalizedSkillsBrowseFilters, SkillsBrowsePageSlice } from "@/utils/browse";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const getGridCols = (sidebarOpen: boolean, viewMode: "grid" | "list") => {
  if (viewMode === "list") {
    return "grid-cols-1 md:grid-cols-1 xl:grid-cols-1";
  }

  return sidebarOpen
    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
};

const buildBrowseInput = (filters: NormalizedSkillsBrowseFilters) => ({
  category: filters.activeClass === "all" ? undefined : filters.activeClass,
  q: filters.query || undefined,
  sort: filters.sort,
  tag: filters.tags.length > 0 ? filters.tags : undefined,
});

export const BrowseSkillsGrid = ({
  filters,
  onResultsCountChange,
  sidebarOpen,
}: {
  filters: NormalizedSkillsBrowseFilters;
  onResultsCountChange?: (count: number) => void;
  sidebarOpen: boolean;
}) => {
  const viewMode = useAtomValue(skillsViewModeAtom);
  const getInitialPage = useServerFn(getSkillsBrowseInitialPage);
  const getPagination = useServerFn(getSkillsBrowsePagination);
  const browseInput = buildBrowseInput(filters);

  const query = useInfiniteQuery<SkillsBrowsePageSlice, Error>({
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor || undefined,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      typeof pageParam === "string"
        ? getPagination({ data: { ...browseInput, cursor: pageParam } })
        : getInitialPage({ data: browseInput }),
    queryKey: [
      "skillsBrowseGrid",
      filters.activeClass,
      filters.query,
      filters.sort,
      filters.tags.join("|"),
    ],
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.page);
  const hasNextPage = Boolean(query.hasNextPage);
  const isLoading = query.isPending && items.length === 0;
  const hasError = query.isError && items.length === 0;

  useEffect(() => {
    onResultsCountChange?.(items.length);
  }, [items.length, onResultsCountChange]);

  if (isLoading) {
    return (
      <div className="border-border border-t border-l px-6 py-16 text-center font-mono text-[11px] tracking-[.14em] uppercase text-muted-text">
        TODO: skeleton
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="border-border border-t border-l px-6 py-16 text-center font-mono text-[11px] tracking-[.14em] uppercase text-destructive">
        Something went wrong while loading skills.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="border-border border-t border-l">
        <BrowseSkillList skills={items} />
        <LoadMore
          fetchNextPage={() => query.fetchNextPage()}
          hasNextPage={hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
        />
      </div>
    );
  }

  const gridCols = getGridCols(sidebarOpen, viewMode);

  return (
    <>
      <motion.div
        layout
        className={cn("border-border grid border-t border-l", gridCols)}
        transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.length > 0 ? (
            items.map((skill) => (
              <motion.div
                key={skill.id}
                layout
                exit={{ opacity: 0, scale: 0.98 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-w-0"
              >
                <SkillCardBrowse skill={skill} />
              </motion.div>
            ))
          ) : (
            <motion.div
              layout
              className="col-span-full px-6 py-16 text-center font-mono text-[11px] tracking-[.14em] uppercase text-muted-text"
            >
              {m.skills_browse_no_matches()}{" "}
              <Link className="text-ink underline underline-offset-3" to="/skills">
                {m.skills_browse_clear_all()}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <LoadMore
        fetchNextPage={() => query.fetchNextPage()}
        hasNextPage={hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
      />
    </>
  );
};
