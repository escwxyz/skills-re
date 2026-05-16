import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { z } from "zod/v4";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useServerFn } from "@tanstack/react-start";

import { PageHero } from "@/components/page-hero";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { BrowseFiltersSidebar } from "@/components/browse-filters-sidebar";
import { BrowseSkillsGrid } from "@/components/browse-skills-grid";
import { BrowseStatsRow } from "@/components/browse-stats-row";
import { SearchFocusBackdrop } from "@/components/search-focus-backdrop";
import { SemanticSearchResults } from "@/components/semantic-search-results";
import {
  isLoginDialogOpenAtom,
  loginDialogDescriptionAtom,
  loginDialogTitleAtom,
} from "@/atoms/app";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSkillsBrowseMeta } from "@/functions/skills/get-skills-browse-meta";
import { getSkillsSearch } from "@/functions/skills/get-skills-search";
import type { FetchSkillsSearchResult } from "@/functions/skills/skills.server";
import { formatInteger } from "@/utils/format";
import { getBrowseSortLabel, normalizeSkillsBrowseFilters } from "@/utils/browse";
import { m } from "@/paraglide/messages";
import { OG_SKILLS_IMAGE_PATH } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { isRateLimitedSearchError } from "@/utils/is-rate-limited-search-error";
import { BrowseToolbar } from "@/components/browse-toolbar";

const browseSortValues = [
  "newest",
  "updated",
  "views",
  "downloads-trending",
  "downloads-all-time",
  "stars",
] as const;

const filterSchema = z.object({
  category: z.string().trim().optional(),
  mode: z.enum(["search"]).optional(),
  q: z.string().trim().optional(),
  sort: z.enum(browseSortValues).optional(),
  tag: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

type SemanticSearchData = Extract<FetchSkillsSearchResult, { status: "ok" }>["data"];

export const Route = createFileRoute("/_publicLayout/skills/")({
  validateSearch: filterSchema,
  loaderDeps: ({ search }) => ({
    category: search.category,
    q: search.q,
    sort: search.sort,
    tag: search.tag,
    tags: search.tags,
  }),
  loader: ({ deps }) => getSkillsBrowseMeta({ data: deps }),
  head: () =>
    createSeo({
      canonicalPath: "/skills/",
      description: String(m.skills_browse_description()),
      image: OG_SKILLS_IMAGE_PATH,
      title: String(m.skills_browse_title()),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const browseMeta = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/skills/" });
  const { currentUser } = useRouteContext({ from: "__root__" });
  const isMobile = useIsMobile();
  const setLoginDialogOpen = useSetAtom(isLoginDialogOpenAtom);
  const setLoginDialogTitle = useSetAtom(loginDialogTitleAtom);
  const setLoginDialogDescription = useSetAtom(loginDialogDescriptionAtom);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [browseResultCount, setBrowseResultCount] = useState(0);
  const [isSearchBlocked, setIsSearchBlocked] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchMode = search.mode === "search" || Boolean(search.q);
  const semanticQueryText = (search.q ?? "").trim();
  const searchSkills = useServerFn(getSkillsSearch);
  const isSearchInputLocked = isSearchBlocked && currentUser === null;
  const browseFilters = normalizeSkillsBrowseFilters({
    category: search.category,
    q: search.q,
    sort: search.sort,
    tag: [...new Set([...(search.tag ?? []), ...(search.tags ?? [])])],
  });

  const semanticQuery = useQuery<SemanticSearchData, Error>({
    enabled: isSearchMode && semanticQueryText.length > 0 && !isSearchInputLocked,
    queryFn: async () => {
      const result = (await searchSkills({
        data: {
          limit: 24,
          query: semanticQueryText,
          rewriteQuery: true,
        },
      })) as FetchSkillsSearchResult;

      if (result.status === "rate_limited") {
        throw new Error(result.message);
      }

      return result.data;
    },
    queryKey: ["skills-semantic-search", semanticQueryText],
    retry: false,
  });

  useEffect(
    () => () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setSearchDraft(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    if (!isSearchMode) {
      return;
    }

    searchInputRef.current?.focus({ preventScroll: true });
  }, [isSearchMode]);

  useEffect(() => {
    if (
      currentUser === null &&
      semanticQuery.error &&
      isRateLimitedSearchError(semanticQuery.error)
    ) {
      setIsSearchBlocked(true);
      setLoginDialogTitle("Search limit reached");
      setLoginDialogDescription(semanticQuery.error.message);
      setLoginDialogOpen(true);
    }
  }, [
    currentUser,
    semanticQuery.error,
    setLoginDialogDescription,
    setLoginDialogOpen,
    setLoginDialogTitle,
    setIsSearchBlocked,
  ]);
  const semanticItems = semanticQuery.data?.page ?? [];
  const semanticMeta = semanticQuery.data?.ai
    ? {
        resolvedSkillsCount: semanticQuery.data.ai.resolvedSkillsCount,
        resultCount: semanticQuery.data.ai.resultCount,
      }
    : undefined;

  const enterSearchMode = () => {
    if (isSearchMode) {
      return;
    }

    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mode: "search",
      }),
    });
  };

  const submitSearch = () => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
    }
    const nextQuery = searchDraft.trim();
    submitTimerRef.current = setTimeout(() => {
      void navigate({
        replace: true,
        search: (prev) => ({
          ...prev,
          mode: "search",
          q: nextQuery || undefined,
        }),
      });
    }, 300);
  };

  const clearSearch = () => {
    setSearchDraft("");
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mode: undefined,
        q: undefined,
      }),
    });
  };

  return (
    <>
      <SearchFocusBackdrop active={isSearchMode && searchDraft.trim().length === 0} />
      <div className="min-w-0 flex-1">
        <PageHero
          eyebrow={m.skills_browse_eyebrow()}
          description={m.skills_browse_description()}
          descriptionItalic
          stats={[
            {
              label: m.skills_browse_stat_skills(),
              value: formatInteger(browseMeta.counts.skills),
            },
            {
              label: m.skills_browse_stat_categories(),
              value: formatInteger(browseMeta.counts.categories),
            },
            {
              label: m.skills_browse_stat_new_skills_30d(),
              value: formatInteger(browseMeta.counts.newSkills30d),
            },
            {
              label: m.skills_browse_stat_active_filters(),
              value: formatInteger(browseMeta.counts.activeFilters),
            },
          ]}
        >
          {m.skills_browse_title()}
        </PageHero>

        <div className="relative z-20 flex items-start bg-paper">
          {isSearchMode ? null : (
            <BrowseFiltersSidebar
              categories={browseMeta.categories}
              isMobile={isMobile}
              filters={browseFilters}
              onOpenChange={setFiltersOpen}
              open={filtersOpen}
              tags={browseMeta.tags}
            />
          )}

          <div className="min-w-0 flex-1">
            <BrowseToolbar
              activeFilterCount={browseMeta.counts.activeFilters}
              filters={browseFilters}
              filtersOpen={filtersOpen}
              inputRef={searchInputRef}
              isSearchMode={isSearchMode}
              isSearching={semanticQuery.isFetching}
              onClearSearch={clearSearch}
              onSearchChange={setSearchDraft}
              onSearchFocus={enterSearchMode}
              onSearchSubmit={submitSearch}
              onToggleFilters={() => setFiltersOpen((value) => !value)}
              searchDisabled={isSearchInputLocked}
              searchValue={searchDraft}
            />

            {isSearchMode ? (
              <SemanticSearchResults
                error={semanticQuery.error}
                isLoading={semanticQuery.isFetching}
                items={semanticItems}
                meta={semanticMeta}
                query={semanticQueryText}
              />
            ) : (
              <>
                <BrowseStatsRow
                  from={browseResultCount > 0 ? 1 : 0}
                  hasItems={browseResultCount > 0}
                  sortLabel={getBrowseSortLabel(browseFilters.sort)}
                  to={browseResultCount}
                  totalSkills={browseMeta.counts.skills}
                />

                <BrowseSkillsGrid
                  filters={browseFilters}
                  onResultsCountChange={setBrowseResultCount}
                  sidebarOpen={filtersOpen}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <ScrollToTopButton />
    </>
  );
}
