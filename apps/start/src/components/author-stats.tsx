import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { getAuthorStats } from "@/functions/authors/get-author-stats";
import {
  author_stats_aggregate_stars,
  author_stats_avg_audit_score,
  author_stats_published_skills,
  author_stats_repositories,
  author_stats_total_installs,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

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
  const getStats = useServerFn(getAuthorStats);

  const { data, isLoading } = useQuery({
    queryKey: ["authorStats", handle],
    queryFn: () => getStats({ data: { handle } }),
    refetchInterval: 2 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <AuthorStatsSkeleton />;
  }

  if (!data) {
    return null;
  }

  const metrics = [
    {
      label: String(author_stats_published_skills()),
      value: Intl.NumberFormat(locale).format(skillCount ?? data.skillCount),
    },
    {
      label: String(author_stats_repositories()),
      value: Intl.NumberFormat(locale).format(repoCount ?? 0),
    },
    {
      label: String(author_stats_total_installs()),
      value: Intl.NumberFormat(locale).format(data.totalDownloads),
    },
    {
      label: String(author_stats_aggregate_stars()),
      value: Intl.NumberFormat(locale).format(data.totalStars),
    },
    {
      label: String(author_stats_avg_audit_score()),
      value: data.averageAuditScore === null ? "—" : `${data.averageAuditScore}/100`,
    },
  ];

  return (
    <div className="border-border grid grid-cols-2 border-b-[3px] sm:grid-cols-3 md:grid-cols-5">
      {metrics.map((stat, index) => (
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
