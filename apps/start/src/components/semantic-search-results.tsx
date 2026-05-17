"use client";

import { Link } from "@tanstack/react-router";

import { buildSkillDetailPath } from "@/lib/skill-path";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { formatCompactNumber, formatInteger } from "@/utils/format";
import { isRateLimitedSearchError } from "@/utils/is-rate-limited-search-error";
import type { BrowseSkillItem } from "@/utils/types";

interface SemanticSearchMeta {
  resolvedSkillsCount: number;
  resultCount: number;
}

interface SemanticSearchResultsProps {
  error?: Error | null;
  isLoading: boolean;
  items: BrowseSkillItem[];
  meta?: SemanticSearchMeta;
  query: string;
}

const getSkillHref = (skill: BrowseSkillItem) =>
  buildSkillDetailPath({
    authorHandle: skill.authorHandle,
    repoName: skill.repoName ?? "",
    skillSlug: skill.slug,
  });

const formatScore = (score?: number) => {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return null;
  }

  const normalized = score <= 1 ? score * 100 : score;
  return normalized.toFixed(1);
};

const getRelatedTags = (items: BrowseSkillItem[]) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([tag]) => tag);
};

const SemanticResultSkeletonRow = () => (
  <div className="grid gap-5 border-border border-b px-6 py-6 md:grid-cols-[4.5rem_minmax(0,1fr)_8rem]">
    <Skeleton className="h-10 w-8" />
    <div className="space-y-3">
      <Skeleton className="h-2.5 w-28" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-3.5 w-full max-w-xl" />
      <Skeleton className="h-3.5 w-2/3 max-w-lg" />
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
    <div className="hidden space-y-1 md:block">
      <Skeleton className="ml-auto h-7 w-10" />
      <Skeleton className="ml-auto h-2.5 w-16" />
    </div>
  </div>
);

const SemanticSearchSkeleton = () => (
  <div>
    {Array.from({ length: 6 }).map((_, i) => (
      <SemanticResultSkeletonRow key={i} />
    ))}
  </div>
);

const SemanticSearchEmpty = ({ query }: { query: string }) => (
  <div className="border-border border-t px-6 py-16 text-center">
    <div className="font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-text">
      {query ? m.semantic_search_no_matches() : m.semantic_search_start_typing()}
    </div>
    <p className="mx-auto mt-3 max-w-lg font-serif text-sm text-ink-2">
      {query ? m.semantic_search_try_broader_phrase() : m.semantic_search_use_natural_language()}
    </p>
  </div>
);

const SemanticSearchHeader = ({
  isLoading,
  meta,
  query,
}: Pick<SemanticSearchResultsProps, "isLoading" | "meta" | "query">) => {
  let statusLabel = m.semantic_search_status_ai();
  if (isLoading) {
    statusLabel = m.semantic_search_status_searching();
  } else if (meta) {
    statusLabel = m.semantic_search_status_matches({
      resolvedSkillsCount: formatInteger(meta.resolvedSkillsCount),
      resultCount: formatInteger(meta.resultCount),
    });
  }

  return (
    <div className="flex items-center justify-between border-border border-b px-6 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
      <span>{query ? m.semantic_search_results_for({ query }) : m.semantic_search_title()}</span>
      <span>{statusLabel}</span>
    </div>
  );
};

const escapeRegex = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HighlightedText = ({ query, text }: { query?: string; text: string }) => {
  const words = (query ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!words.length) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark className="bg-accent/15 text-accent not-italic" key={i}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};

const MatchSnippet = ({ query, skill }: { query?: string; skill: BrowseSkillItem }) =>
  skill.aiMatch?.snippet ? (
    <div className="mt-4 border-l-2 border-accent bg-muted/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
      {skill.aiMatch.sourcePath ? (
        <div className="mb-1 text-[10px] tracking-[.12em] uppercase text-muted-text">
          {skill.aiMatch.sourcePath}
        </div>
      ) : null}
      <HighlightedText query={query} text={skill.aiMatch.snippet} />
    </div>
  ) : null;

const SemanticResultRow = ({
  index,
  query,
  skill,
}: {
  index: number;
  query?: string;
  skill: BrowseSkillItem;
}) => {
  const locale = getLocale();
  const score = formatScore(skill.aiMatch?.score);
  const downloads = formatCompactNumber(skill.downloadsAllTime ?? 0, locale);

  return (
    <Link
      className="grid gap-5 border-border border-b px-6 py-6 text-ink no-underline transition-colors hover:bg-paper-2 md:grid-cols-[4.5rem_minmax(0,1fr)_8rem]"
      to={getSkillHref(skill)}
    >
      <div className="font-display text-5xl italic leading-none text-muted-text">
        {String(index + 1).padStart(2, "0")}.
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
          Skill · {skill.latestVersion ? `v.${skill.latestVersion} · ` : ""}
          {skill.authorHandle ?? "unknown"}
        </div>
        <h3 className="mt-2 font-display text-[30px] font-normal leading-none">{skill.title}</h3>
        <p className="mt-2 max-w-3xl font-serif text-[15px] leading-relaxed text-ink-2">
          {skill.description}
        </p>
        <MatchSnippet query={query} skill={skill} />
        {skill.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 5).map((tag) => (
              <span
                className="border border-border px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-muted-text"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="font-mono text-[10px] tracking-[.12em] uppercase text-muted-text md:text-right">
        {score ? (
          <div className="font-display text-3xl italic tracking-normal text-accent">{score}</div>
        ) : null}
        {score ? <div>{m.semantic_search_match_score()}</div> : null}
        <div className="mt-4">
          Inst
          <b className="block font-display text-base font-normal tracking-normal text-ink">
            {downloads}
          </b>
        </div>
      </div>
    </Link>
  );
};

const SemanticSearchRail = ({
  items,
  meta,
  query,
}: Pick<SemanticSearchResultsProps, "items" | "meta" | "query">) => {
  const tags = getRelatedTags(items);

  return (
    <aside className="hidden border-border border-l bg-paper-2 p-6 xl:block">
      <div className="border border-border bg-card p-5">
        <div className="font-serif text-base italic text-ink-2">
          {m.semantic_search_did_you_mean()}
        </div>
        <div className="mt-4 font-display text-2xl italic">
          {query || m.semantic_search_describe_task()}
        </div>
        <div className="mt-4 font-mono text-[10.5px] tracking-[.12em] uppercase text-muted-text">
          {meta
            ? m.semantic_search_matches_count({ count: formatInteger(meta.resultCount) })
            : m.semantic_search_index_label()}
        </div>
      </div>

      {tags.length ? (
        <section className="mt-8">
          <h4 className="font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-text">
            Related tags
          </h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                className="border border-border px-2.5 py-1.5 font-mono text-[10px] tracking-widest uppercase text-ink no-underline hover:bg-ink hover:text-paper"
                key={tag}
                search={{ tag: [tag] }}
                to="/skills"
              >
                {tag}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
};

export const SemanticSearchResults = ({
  error,
  isLoading,
  items,
  meta,
  query,
}: SemanticSearchResultsProps) => {
  if (error) {
    if (isRateLimitedSearchError(error)) {
      return (
        <div className="border-border border-t px-6 py-16 text-center">
          <div className="font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-text">
            Search temporarily limited
          </div>
          <p className="mx-auto mt-3 max-w-lg font-serif text-sm text-ink-2">{error.message}</p>
        </div>
      );
    }

    return (
      <div className="border-border border-t px-6 py-16 text-center">
        <div className="font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-text">
          Search unavailable
        </div>
        <p className="mx-auto mt-3 max-w-lg font-serif text-sm text-ink-2">{error.message}</p>
      </div>
    );
  }

  let resultsContent;
  if (isLoading && items.length === 0 && query.trim().length > 0) {
    resultsContent = <SemanticSearchSkeleton />;
  } else if (items.length === 0) {
    resultsContent = <SemanticSearchEmpty query={query} />;
  } else {
    resultsContent = (
      <div>
        {items.map((skill, index) => (
          <SemanticResultRow index={index} key={skill.id} query={query} skill={skill} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid min-h-[50svh] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <SemanticSearchHeader isLoading={isLoading} meta={meta} query={query} />
        {resultsContent}
      </div>
      <SemanticSearchRail items={items} meta={meta} query={query} />
    </div>
  );
};
