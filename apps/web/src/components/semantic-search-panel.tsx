"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { SearchRateLimitPrompt } from "@/components/search-rate-limit-prompt";
import { SkillCard } from "@/components/skill-card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { buildSearchPageData, getEmptySearchPageData } from "@/lib/search-data";
import type { SearchPageData, SearchSkillListItem } from "@/lib/search-data";

const DEBOUNCE_MS = 320;

type SearchState = "idle" | "loading" | "ready" | "rate_limited" | "error";

interface Props {
  initialData: SearchPageData;
}

const isRateLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; status?: unknown };
  return (
    candidate.status === 429 ||
    candidate.code === "RATE_LIMITED" ||
    candidate.code === "TOO_MANY_REQUESTS"
  );
};

const buildSearchUrl = (query: string) => {
  const url = new URL(window.location.href);
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const SemanticSearchSkeleton = () => (
  <div className="grid grid-cols-1 border-l border-t border-rule md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex h-full flex-col border-b border-r border-rule p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
          <Skeleton className="h-9 w-16 rounded-none" />
        </div>

        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-4 h-24 w-full" />

        <div className="mt-auto flex flex-wrap gap-1 pt-4">
          <Skeleton className="h-5 w-12 rounded-none" />
          <Skeleton className="h-5 w-14 rounded-none" />
          <Skeleton className="h-5 w-10 rounded-none" />
        </div>
      </div>
    ))}
  </div>
);

const SearchResultsGrid = ({ items }: { items: SearchPageData["items"] }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 border-l border-t border-rule md:grid-cols-2 xl:grid-cols-3">
      {items.map((skill) => (
        <div key={skill.id} className="min-w-0">
          <SkillCard skill={skill} />
        </div>
      ))}
    </div>
  );
};

export const SemanticSearchPanel = ({ initialData }: Props) => {
  const [draftQuery, setDraftQuery] = useState(initialData.query);
  const [pageData, setPageData] = useState(
    initialData.query ? initialData : getEmptySearchPageData(),
  );
  let initialSearchState: SearchState = "idle";
  if (initialData.mode === "rate_limited") {
    initialSearchState = "rate_limited";
  } else if (initialData.mode === "search") {
    initialSearchState = "ready";
  }
  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const requestId = useRef(0);
  const didSkipInitialSearch = useRef(false);
  const committedQuery = useRef(initialData.mode === "search" ? initialData.query.trim() : "");
  const currentQuery = draftQuery.trim();
  const isPendingSearch = currentQuery.length > 0 && currentQuery !== committedQuery.current;

  useEffect(() => {
    const titleQuery = currentQuery || pageData.query;
    document.title = titleQuery ? `"${titleQuery}" - Search - skills.re` : "Search - skills.re";
  }, [currentQuery, pageData.query]);

  useEffect(() => {
    const handlePopState = () => {
      const nextQuery = new URL(window.location.href).searchParams.get("q")?.trim() ?? "";
      committedQuery.current = nextQuery;
      setDraftQuery(nextQuery);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const normalized = draftQuery.trim();

    if (initialData.mode !== "search" && !didSkipInitialSearch.current) {
      didSkipInitialSearch.current = true;
      return;
    }

    if (normalized === committedQuery.current) {
      return;
    }

    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }

    if (!normalized) {
      requestId.current += 1;
      committedQuery.current = "";
      setPageData(getEmptySearchPageData());
      setSearchState("idle");
      setErrorMessage(null);
      setIsLoading(false);
      window.history.replaceState({}, "", buildSearchUrl(""));
      return;
    }

    debounceTimer.current = window.setTimeout(() => {
      const run = async () => {
        const nextRequestId = requestId.current + 1;
        requestId.current = nextRequestId;
        committedQuery.current = normalized;
        setIsLoading(true);
        setSearchState("loading");
        setErrorMessage(null);
        window.history.replaceState({}, "", buildSearchUrl(normalized));

        try {
          const result = await orpc.skills.search({
            query: normalized,
            rewriteQuery: true,
          });

          if (requestId.current !== nextRequestId) {
            return;
          }

          const nextItems = result.page as SearchSkillListItem[];
          setPageData(buildSearchPageData(normalized, nextItems));
          setSearchState("ready");
        } catch (error) {
          if (requestId.current !== nextRequestId) {
            return;
          }

          if (isRateLimitError(error)) {
            setPageData({
              items: [],
              mode: "rate_limited",
              note: "",
              query: normalized,
              resultLabel: "",
              titleLabel: normalized,
            });
            setSearchState("rate_limited");
            return;
          }

          setSearchState("error");
          setErrorMessage(
            error instanceof Error ? error.message : "The semantic search request failed.",
          );
        } finally {
          if (requestId.current === nextRequestId) {
            setIsLoading(false);
          }
        }
      };

      void run();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [draftQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = draftQuery.trim();
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }

    if (!normalized) {
      requestId.current += 1;
      committedQuery.current = "";
      setPageData(getEmptySearchPageData());
      setSearchState("idle");
      setErrorMessage(null);
      setIsLoading(false);
      window.history.replaceState({}, "", buildSearchUrl(""));
      return;
    }

    const nextRequestId = requestId.current + 1;
    requestId.current = nextRequestId;
    committedQuery.current = normalized;
    setIsLoading(true);
    setSearchState("loading");
    setErrorMessage(null);
    window.history.replaceState({}, "", buildSearchUrl(normalized));

    void (async () => {
      try {
        const result = await orpc.skills.search({
          query: normalized,
          rewriteQuery: true,
        });

        if (requestId.current !== nextRequestId) {
          return;
        }

        setPageData(buildSearchPageData(normalized, result.page as SearchSkillListItem[]));
        setSearchState("ready");
      } catch (error) {
        if (requestId.current !== nextRequestId) {
          return;
        }

        if (isRateLimitError(error)) {
          setPageData({
            items: [],
            mode: "rate_limited",
            note: "",
            query: normalized,
            resultLabel: "",
            titleLabel: normalized,
          });
          setSearchState("rate_limited");
          return;
        }

        setSearchState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "The semantic search request failed.",
        );
      } finally {
        if (requestId.current === nextRequestId) {
          setIsLoading(false);
        }
      }
    })();
  };

  let statusText = "Type a question, task, or capability to begin.";
  if (searchState === "loading") {
    statusText = `Searching semantic index for "${currentQuery}"...`;
  } else if (searchState === "error") {
    statusText = errorMessage ?? "The semantic search request failed.";
  } else if (isPendingSearch) {
    statusText = `Queued search for "${currentQuery}"...`;
  } else if (pageData.mode === "search") {
    statusText = pageData.resultLabel;
  } else if (pageData.mode === "rate_limited") {
    statusText = "Search limit reached";
  }

  const renderBody = () => {
    if (isLoading) {
      return <SemanticSearchSkeleton />;
    }

    if (pageData.mode === "rate_limited") {
      return <SearchRateLimitPrompt />;
    }

    if (pageData.mode === "search" && pageData.items.length > 0) {
      return <SearchResultsGrid items={pageData.items} />;
    }

    if (pageData.mode === "search") {
      return (
        <div className="border-b border-rule px-6 py-12">
          <div className="max-w-3xl border border-rule bg-paper-2 px-5 py-6">
            <div className="eyebrow text-editorial-red mb-2">§ Search</div>
            <p className="text-ink-2 m-0">
              No skills matched this semantic query. Try a broader request or use different wording.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="border-b border-rule px-6 py-12">
        <div className="max-w-3xl border border-rule bg-paper-2 px-5 py-6">
          <div className="eyebrow text-editorial-blue mb-2">§ Semantic AI</div>
          <p className="text-ink-2 m-0">
            {pageData.note ||
              "Ask for a capability, a workflow, or a natural language description. The search result URL is kept in sync while the page updates in place."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div aria-busy={isLoading} className="border-rule border-t">
      <form
        className="grid grid-cols-1 border-b border-rule md:grid-cols-[1fr_auto]"
        onSubmit={submitSearch}
      >
        <label className="flex items-center gap-3 px-6 py-5">
          <span className="font-mono text-[18px] text-editorial-red">&gt;</span>
          <input
            aria-label="Semantic search query"
            autoComplete="off"
            className="w-full border-0 bg-transparent p-0 font-display text-[28px] tracking-[-0.01em] outline-none placeholder:text-muted-text"
            name="q"
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="describe the skill you need..."
            type="search"
            value={draftQuery}
          />
        </label>
        <button
          type="submit"
          className="border-rule border-t bg-ink px-6 py-5 font-mono text-[11px] tracking-[.14em] uppercase text-paper md:border-t-0 md:border-l"
        >
          Search
        </button>
      </form>

      <div
        aria-atomic="true"
        aria-live="polite"
        className="border-b border-rule bg-paper-2 px-6 py-3 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text"
      >
        <span>{statusText}</span>
      </div>

      {errorMessage ? (
        <div className="border-b border-rule px-6 py-5">
          <div className="max-w-3xl border border-rule bg-paper-2 px-5 py-4">
            <div className="eyebrow text-editorial-red mb-2">§ Search Error</div>
            <p className="text-ink-2 m-0">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {renderBody()}
    </div>
  );
};
