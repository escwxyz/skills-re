import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod/v4";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";

import { PageHero } from "@/components/page-hero";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { BrowseFiltersSidebar } from "@/components/browse-filters-sidebar";
import { BrowseSkillsGrid } from "@/components/browse-skills-grid";
import { BrowseStatsRow } from "@/components/browse-stats-row";
import { SearchFocusBackdrop } from "@/components/search-focus-backdrop";
import { SemanticSearchResults } from "@/components/semantic-search-results";
import { isLoginDialogOpenAtom } from "@/atoms/app";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { orpc } from "@/lib/orpc";
import { getSkillsBrowseMeta } from "@/functions/skills/get-skills-browse-meta";
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
  const isMobile = useIsMobile();
  const setLoginDialogOpen = useSetAtom(isLoginDialogOpenAtom);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [browseResultCount, setBrowseResultCount] = useState(0);
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearchDraft = useDebouncedValue(searchDraft, 320);
  const isSearchMode = search.mode === "search" || Boolean(search.q);
  const semanticQueryText = debouncedSearchDraft.trim();
  const browseFilters = normalizeSkillsBrowseFilters({
    category: search.category,
    q: search.q,
    sort: search.sort,
    tag: [...new Set([...(search.tag ?? []), ...(search.tags ?? [])])],
  });

  const semanticQuery = useQuery({
    ...orpc.skills.search.queryOptions({
      input: {
        limit: 24,
        query: semanticQueryText,
        rewriteQuery: true,
      },
    }),
    enabled: isSearchMode && semanticQueryText.length > 0,
  });

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
    if (!isSearchMode) {
      return;
    }

    const nextQuery = debouncedSearchDraft.trim();
    const currentQuery = search.q ?? "";
    if (nextQuery === currentQuery) {
      return;
    }

    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mode: "search",
        q: nextQuery || undefined,
      }),
    });
  }, [debouncedSearchDraft, isSearchMode, navigate, search.q]);

  useEffect(() => {
    if (semanticQuery.error && isRateLimitedSearchError(semanticQuery.error)) {
      setLoginDialogOpen(true);
    }
  }, [semanticQuery.error, setLoginDialogOpen]);
  const semanticItems = semanticQuery.data?.page ?? [];
  const semanticMeta = semanticQuery.data?.ai
    ? {
        resolvedSkillsCount: semanticQuery.data.ai.resolvedSkillsCount,
        resultCount: semanticQuery.data.ai.resultCount,
      }
    : undefined;
  const visibleSemanticError =
    semanticQuery.error && !isRateLimitedSearchError(semanticQuery.error)
      ? semanticQuery.error
      : null;

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
    const nextQuery = searchDraft.trim();
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mode: "search",
        q: nextQuery || undefined,
      }),
    });
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
              searchValue={searchDraft}
            />

            {isSearchMode ? (
              <SemanticSearchResults
                error={visibleSemanticError}
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
