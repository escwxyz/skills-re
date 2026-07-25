import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { z } from "zod/v4";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { loginDialogAtom } from "@/atoms/app";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSkillsBrowseMeta } from "@/functions/skills/get-skills-browse-meta";
import { getSkillsSearch } from "@/functions/skills/get-skills-search";
import type { FetchSkillsSearchResult } from "@/functions/skills/skills.server";
import { formatInteger } from "@/utils/format";
import {
  getBrowseSortLabel,
  normalizeSkillsBrowseFilters,
  shouldNoIndexSkillsBrowseSearch,
} from "@/utils/browse";
import { m } from "@/paraglide/messages";
import { OG_SKILLS_IMAGE_PATH } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { isRateLimitedSearchError } from "@/utils/is-rate-limited-search-error";
import { BrowseToolbar } from "@/components/browse-toolbar";
import { openLoginDialog } from "@/utils/login-dialog";
import type { SkillsSearchMode } from "@/components/skills-search-field";
import { executeSkillSearch } from "@/lib/skill-search-strategy";

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
  searchMode: z.enum(["keyword", "semantic"]).optional(),
  sort: z.enum(browseSortValues).optional(),
  tag: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

type SemanticSearchData = Extract<FetchSkillsSearchResult, { status: "ok" }>["data"];

const getKeywordSearchCategories = (activeClass: string) =>
  activeClass === "all" ? undefined : [activeClass];

const getSearchMeta = (mode: SkillsSearchMode, data?: SemanticSearchData) =>
  mode === "semantic" && data?.ai
    ? {
        resolvedSkillsCount: data.ai.resolvedSkillsCount,
        resultCount: data.ai.resultCount,
      }
    : undefined;

export const Route = createFileRoute("/_publicLayout/skills/")({
  validateSearch: filterSchema,
  loaderDeps: ({ search }) => ({
    category: search.category,
    q: search.q,
    searchMode: search.searchMode,
    sort: search.sort,
    tag: search.tag,
    tags: search.tags,
  }),
  staleTime: 1000 * 60 * 60 * 5,
  loader: ({ deps }) => getSkillsBrowseMeta({ data: deps }),
  head: ({ match }) =>
    createSeo({
      canonicalPath: "/skills",
      description: String(m.skills_browse_description()),
      image: OG_SKILLS_IMAGE_PATH,
      title: String(m.skills_browse_title()),
      locale: getLocale(),
      noIndex: shouldNoIndexSkillsBrowseSearch(match.search),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const browseMeta = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/skills/" });
  const { currentUser } = useRouteContext({ from: "__root__" });
  const isMobile = useIsMobile();
  const setLoginDialog = useSetAtom(loginDialogAtom);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [browseResultCount, setBrowseResultCount] = useState(0);
  const [isSearchBlocked, setIsSearchBlocked] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchMode = search.mode === "search" || Boolean(search.q);
  const selectedSearchMode: SkillsSearchMode = search.searchMode ?? "keyword";
  const searchQueryText = (search.q ?? "").trim();
  const searchSkills = useServerFn(getSkillsSearch);
  const isSearchInputLocked =
    selectedSearchMode === "semantic" && isSearchBlocked && currentUser === null;
  const browseFilters = useMemo(
    () =>
      normalizeSkillsBrowseFilters({
        category: search.category,
        q: search.q,
        sort: search.sort,
        tag: [...new Set([...(search.tag ?? []), ...(search.tags ?? [])])],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search.category, search.q, search.sort, search.tag?.join("|"), search.tags?.join("|")],
  );

  const skillsSearchQuery = useQuery<SemanticSearchData, Error>({
    enabled: isSearchMode && searchQueryText.length > 0 && !isSearchInputLocked,
    queryFn: async () => {
      const serverSearch = async (searchMode: SkillsSearchMode) => {
        const result = (await searchSkills({
          data: {
            categories:
              searchMode === "keyword"
                ? getKeywordSearchCategories(browseFilters.activeClass)
                : undefined,
            limit: 24,
            query: searchQueryText,
            rewriteQuery: searchMode === "semantic",
            searchMode,
            tags: searchMode === "keyword" ? browseFilters.tags : undefined,
          },
        })) as FetchSkillsSearchResult;

        if (result.status === "rate_limited") {
          throw new Error(result.message);
        }

        return result.data;
      };

      return await executeSkillSearch({
        query: searchQueryText,
        searchMode: selectedSearchMode,
        serverSearch,
      });
    },
    queryKey: [
      "skills-search",
      selectedSearchMode,
      searchQueryText,
      browseFilters.activeClass,
      browseFilters.tags,
      search.sort,
    ],
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
      selectedSearchMode === "semantic" &&
      currentUser === null &&
      skillsSearchQuery.error &&
      isRateLimitedSearchError(skillsSearchQuery.error)
    ) {
      setIsSearchBlocked(true);
      openLoginDialog(setLoginDialog, {
        onlyGithub: false,
        title: "Search limit reached",
        description: skillsSearchQuery.error.message,
      });
    }
  }, [
    currentUser,
    selectedSearchMode,
    skillsSearchQuery.error,
    setLoginDialog,
    setIsSearchBlocked,
  ]);
  const searchItems = skillsSearchQuery.data?.page ?? [];
  const searchMeta = getSearchMeta(selectedSearchMode, skillsSearchQuery.data);

  const enterSearchMode = useCallback(() => {
    if (isSearchMode) {
      return;
    }

    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        mode: "search",
        searchMode: prev.searchMode ?? "keyword",
      }),
    });
  }, [isSearchMode, navigate]);

  const submitSearch = useCallback(() => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
    }
    const nextQuery = searchDraft.trim();
    submitTimerRef.current = setTimeout(() => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          mode: "search",
          q: nextQuery || undefined,
          searchMode: prev.searchMode ?? "keyword",
        }),
      });
    }, 300);
  }, [searchDraft, navigate]);

  const setSearchMode = useCallback(
    (searchMode: SkillsSearchMode) => {
      if (searchMode === selectedSearchMode) {
        return;
      }

      if (searchMode === "keyword") {
        setIsSearchBlocked(false);
      }

      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          mode: "search",
          searchMode,
        }),
      });
    },
    [navigate, selectedSearchMode],
  );

  const clearSearch = useCallback(() => {
    setSearchDraft("");
    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        mode: undefined,
        q: undefined,
        searchMode: undefined,
      }),
    });
  }, [navigate]);

  return (
    <>
      <SearchFocusBackdrop
        active={isSearchMode && searchDraft.trim().length === 0}
        onClick={clearSearch}
      />
      <div className="min-w-0 flex-1">
        <PageHero
          eyebrow={m.skills_browse_eyebrow()}
          description={m.skills_browse_description()}
          descriptionClassName="font-sans"
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

        <div className="relative z-20 flex items-start bg-background">
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
              onClearSearch={clearSearch}
              onSearchChange={setSearchDraft}
              onSearchFocus={enterSearchMode}
              onSearchModeChange={setSearchMode}
              onSearchSubmit={submitSearch}
              onToggleFilters={() => setFiltersOpen((value) => !value)}
              searchMode={selectedSearchMode}
              searchDisabled={isSearchInputLocked}
              searchValue={searchDraft}
            />

            {isSearchMode ? (
              <SemanticSearchResults
                error={skillsSearchQuery.error}
                isLoading={skillsSearchQuery.isFetching}
                items={searchItems}
                meta={searchMeta}
                mode={selectedSearchMode}
                query={searchQueryText}
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
