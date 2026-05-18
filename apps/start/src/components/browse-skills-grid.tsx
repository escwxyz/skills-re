"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { skillsViewModeAtom } from "@/atoms/app";
import { BrowseSkillList } from "@/components/browse-skill-list";
import { LoadMore } from "@/components/load-more";
import { SkillCardBrowse } from "@/components/skill-card-browse";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  const browseInput = useMemo(() => buildBrowseInput(filters), [filters]);

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
    const gridCols = getGridCols(sidebarOpen, viewMode);

    if (viewMode === "list") {
      return (
        <div className="border-border border-t border-l">
          <div className="space-y-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-sm" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("border-border grid border-t border-l", gridCols)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-r border-b border-border p-5">
            <Skeleton className="h-36 w-full mb-3" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="border-border border-t border-l px-6 py-16 text-center font-mono text-[11px] tracking-[.14em] uppercase text-destructive">
        <div className="mb-2">{m.dashboard_skills_failed()}</div>
        <div className="text-muted-foreground">{m.dashboard_skills_failed_description()}</div>
        <div className="mt-4">
          <Button onClick={() => query.refetch()}>{m.error_component_try_again_later()}</Button>
        </div>
        {query.error ? (
          <pre className="mt-3 text-left text-xs text-destructive/80 max-w-3xl mx-auto whitespace-pre-wrap">
            {String(query.error?.message)}
          </pre>
        ) : null}
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
              className="col-span-full px-6 py-16 text-center font-mono text-[11px] tracking-[.14em] uppercase text-muted-foreground"
            >
              {m.skills_browse_no_matches()}{" "}
              <Link className="text-foreground underline underline-offset-3" to="/skills">
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
