"use client";

import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";

import { skillsViewModeAtom } from "@/atoms/app";
import { buildSkillDetailPath } from "@/lib/skill-path";
import { cn } from "@/lib/utils";
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

const MatchSnippet = ({ skill }: { skill: BrowseSkillItem }) =>
  skill.aiMatch?.snippet ? (
    <div className="mt-4 border-l-2 border-accent bg-muted/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
      {skill.aiMatch.sourcePath ? (
        <div className="mb-1 text-[10px] tracking-[.12em] uppercase text-muted-text">
          {skill.aiMatch.sourcePath}
        </div>
      ) : null}
      {skill.aiMatch.snippet}
    </div>
  ) : null;

const SemanticResultRow = ({ index, skill }: { index: number; skill: BrowseSkillItem }) => {
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
        <MatchSnippet skill={skill} />
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

const SemanticResultCard = ({ skill }: { skill: BrowseSkillItem }) => {
  const locale = getLocale();
  const score = formatScore(skill.aiMatch?.score);
  const downloads = formatCompactNumber(skill.downloadsAllTime ?? 0, locale);

  return (
    <Link
      className="flex min-h-72 flex-col border-b border-r border-border p-5 text-ink no-underline transition-colors hover:bg-paper-2"
      to={getSkillHref(skill)}
    >
      <div className="mb-4 flex items-start justify-between gap-3 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
        <span className="truncate">{skill.authorHandle ?? "unknown"}</span>
        {score ? <span className="text-accent">{score}</span> : null}
      </div>
      <h3 className="font-display text-[24px] font-normal leading-[1.05]">{skill.title}</h3>
      <p className="mt-3 line-clamp-3 font-serif text-[13px] leading-normal text-ink-2">
        {skill.description}
      </p>
      <MatchSnippet skill={skill} />
      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <div className="flex flex-wrap gap-1">
          {(skill.tags ?? []).slice(0, 3).map((tag) => (
            <span
              className="border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-[.08em] uppercase text-muted-text"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="font-mono text-[10px] tracking-[.12em] uppercase text-muted-text">
          {downloads}
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
  const viewMode = useAtomValue(skillsViewModeAtom);

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
  if (items.length === 0) {
    resultsContent = <SemanticSearchEmpty query={query} />;
  } else if (viewMode === "list") {
    resultsContent = (
      <div>
        {items.map((skill, index) => (
          <SemanticResultRow index={index} key={skill.id} skill={skill} />
        ))}
      </div>
    );
  } else {
    resultsContent = (
      <motion.div
        className={cn("grid border-border border-l", "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}
        layout
        transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((skill) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0"
              exit={{ opacity: 0, scale: 0.98 }}
              initial={{ opacity: 0, y: 8 }}
              key={skill.id}
              layout
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <SemanticResultCard skill={skill} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
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
