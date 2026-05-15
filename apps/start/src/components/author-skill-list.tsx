import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadMore } from "@/components/load-more";
import { getAuthorSkills } from "@/functions/authors/get-author-skills";
import {
  author_skills_filtered_by,
  author_skills_none,
  author_skills_title,
  author_skills_total_sorted,
  skill_card_metric_audit,
  skill_card_metric_installs,
  skill_card_metric_stars,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { toAuthorSkillRowData } from "@/utils/author-detail-data";
import type { fetchAuthorSkillsPagination } from "@/functions/authors/authors.server";

interface AuthorSkillRowData {
  auditScoreLabel: string;
  authorHandle: string;
  description: string;
  downloadsLabel: string;
  id: string;
  index: number;
  latestVersionLabel: string;
  licenseLabel: string;
  repoName: string;
  slug: string;
  starsLabel: string;
  title: string;
}

const SkillRow = ({ skill }: { skill: AuthorSkillRowData }) => {
  const metrics = [
    { fn: skill_card_metric_audit, val: skill.auditScoreLabel },
    { fn: skill_card_metric_installs, val: skill.downloadsLabel },
    { fn: skill_card_metric_stars, val: skill.starsLabel },
  ];

  return (
    <Link
      to="/skills/$author/$repo/$slug"
      params={{
        author: skill.authorHandle,
        repo: skill.repoName,
        slug: skill.slug,
      }}
      className="border-border grid grid-cols-[32px_1fr] items-baseline gap-4 border-b border-dashed py-4 no-underline sm:grid-cols-[50px_1fr] md:grid-cols-[50px_1fr_80px_80px_80px] md:gap-5"
    >
      <div className="text-muted-foreground font-mono text-[11px] tracking-[.14em]">
        {String(skill.index + 1).padStart(2, "0")}.
      </div>
      <div>
        <h4 className="font-display m-0 mb-1 text-[clamp(20px,3vw,28px)] font-normal">
          {skill.title}
        </h4>
        <div className="text-muted-foreground max-w-130 font-serif text-sm leading-normal">
          {skill.description}
        </div>
        <div className="text-muted-foreground mt-1.5 font-mono text-[10px] tracking-[.14em] uppercase">
          {skill.id} · {skill.latestVersionLabel} · {skill.licenseLabel}
        </div>
        <div className="mt-3 flex gap-5 md:hidden">
          {metrics.map(({ fn, val }) => (
            <div
              key={val}
              className="text-muted-foreground font-mono text-[10.5px] tracking-[.08em] uppercase"
            >
              {fn()}
              <b className="font-display text-foreground block text-sm font-medium tracking-normal normal-case">
                {val}
              </b>
            </div>
          ))}
        </div>
      </div>
      {metrics.map(({ fn, val }) => (
        <div
          key={val}
          className="text-muted-foreground hidden font-mono text-[10.5px] tracking-[.08em] uppercase md:block"
        >
          {fn()}
          <b className="font-display text-foreground block text-sm font-medium tracking-normal normal-case">
            {val}
          </b>
        </div>
      ))}
    </Link>
  );
};

interface Props {
  handle: string;
  repoName?: string;
}

export const AuthorSkillList = ({ handle, repoName }: Props) => {
  const locale = getLocale();
  const getSkills = useServerFn(getAuthorSkills);

  const query = useInfiniteQuery<Awaited<ReturnType<typeof fetchAuthorSkillsPagination>>, Error>({
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor || undefined,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getSkills({
        data: {
          cursor: typeof pageParam === "string" ? pageParam : undefined,
          handle,
          limit: 24,
          repoName,
        },
      }),
    queryKey: ["authorSkills", handle, repoName ?? "all"],
    refetchInterval: 6 * 60 * 60 * 1000,
  });

  const pages = query.data?.pages ?? [];
  const skills = pages.flatMap((page) => page.page);
  const isLoading = query.isPending && skills.length === 0;

  if (isLoading) {
    return <AuthorSkillListSkeleton />;
  }

  const rowSkills = skills.map((skill, index) => toAuthorSkillRowData(skill, index, locale));

  return (
    <div className="py-9 pr-6 pl-4 md:pr-8 md:pl-6">
      <div className="border-border sticky top-(--header-height) z-20 mb-5 flex items-baseline justify-between border-b bg-background pb-3">
        <div>
          <h3 className="font-display m-0 text-2xl font-normal">{author_skills_title()}</h3>
          {repoName ? (
            <div className="text-muted-foreground mt-1 font-mono text-xs uppercase">
              {author_skills_filtered_by({ repoName })}
            </div>
          ) : null}
        </div>
        <div className="text-muted-foreground font-mono text-xs uppercase">
          {author_skills_total_sorted({ count: String(skills.length) })}
        </div>
      </div>
      {rowSkills.map((skill) => (
        <SkillRow key={skill.id} skill={skill} />
      ))}
      {skills.length === 0 ? (
        <p className="text-muted-foreground font-serif italic">{author_skills_none()}</p>
      ) : null}
      <LoadMore
        fetchNextPage={() => query.fetchNextPage()}
        hasNextPage={Boolean(query.hasNextPage)}
        isFetchingNextPage={query.isFetchingNextPage}
      />
    </div>
  );
};

const AuthorSkillListSkeleton = () => (
  <div className="py-9 pr-6 pl-4 md:pr-8 md:pl-6">
    <div className="border-border mb-5 flex items-baseline justify-between border-b pb-3">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="border-border grid grid-cols-[50px_1fr] gap-4 border-b border-dashed py-4"
      >
        <Skeleton className="h-4 w-8" />
        <div>
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-3 w-full max-w-96" />
          <Skeleton className="mt-1.5 h-2.5 w-64" />
        </div>
      </div>
    ))}
  </div>
);
