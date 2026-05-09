import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { getAuthorSkills } from "@/functions/authors/get-author-skills";
import {
  author_stats_aggregate_stars,
  author_stats_avg_audit_score,
  author_stats_published_skills,
  author_stats_repositories,
  author_stats_total_installs,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { buildAuthorStats } from "@/utils/author-detail-data";

const STAT_LABELS = [
  author_stats_published_skills,
  author_stats_repositories,
  author_stats_total_installs,
  author_stats_aggregate_stars,
  author_stats_avg_audit_score,
];

interface Props {
  handle: string;
  repoCount?: number;
  skillCount?: number;
}

export const AuthorStats = ({ handle, repoCount, skillCount }: Props) => {
  const locale = getLocale();
  const getSkills = useServerFn(getAuthorSkills);

  const { data, isLoading } = useQuery({
    queryKey: ["authorSkills", handle],
    queryFn: () => getSkills({ data: { handle } }),
    select: (skills) => buildAuthorStats({ handle, repoCount, skillCount }, skills, locale),
    refetchInterval: 2 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <AuthorStatsSkeleton />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="border-border grid grid-cols-2 border-b-[3px] sm:grid-cols-3 md:grid-cols-5">
      {data.metrics.map((stat, index) => (
        <div key={stat.label} className="border-border border-r px-5 py-5 last:border-r-0">
          <div className="font-display text-[46px] leading-none font-normal">{stat.value}</div>
          <div className="text-muted-foreground mt-2 font-mono text-[10px] tracking-[.14em] uppercase">
            {STAT_LABELS[index]?.()}
          </div>
        </div>
      ))}
    </div>
  );
};

const AuthorStatsSkeleton = () => (
  <div className="border-border grid grid-cols-2 border-b-[3px] sm:grid-cols-3 md:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="border-border border-r px-5 py-5 last:border-r-0">
        <Skeleton className="h-11 w-20" />
        <Skeleton className="mt-2 h-2.5 w-24" />
      </div>
    ))}
  </div>
);
