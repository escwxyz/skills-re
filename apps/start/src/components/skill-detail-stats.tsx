// oxlint-disable no-nested-ternary
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarBlankIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  SealCheckIcon,
  StarIcon,
} from "@phosphor-icons/react";

import { getSkillDownloadMetrics } from "@/functions/skills/get-skill-download-metrics";
import { getSkillReviewStats } from "@/functions/skills/get-skill-review-stats";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatCompactNumber, formatDate, formatFileSize } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

interface StatItemProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

const StatItem = ({ icon, label, value, sub }: StatItemProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="font-display text-2xl leading-none font-normal tabular-nums">{value}</div>
    {sub ? (
      <div className="font-mono text-xs uppercase tracking-[.14em] text-muted-foreground">
        {sub}
      </div>
    ) : null}
  </div>
);

interface Props {
  createdAt?: number | null;
  downloadsAllTime?: number | null;
  latestSnapshotTotalBytes?: number | null;
  auditScore?: number | null;
  skillId: string;
  viewsAllTime?: number | null;
}

export const SkillDetailStats = ({
  createdAt,
  downloadsAllTime,
  latestSnapshotTotalBytes,
  auditScore,
  skillId,
  viewsAllTime,
}: Props) => {
  const locale = getLocale();
  const getDownloadMetrics = useServerFn(getSkillDownloadMetrics);
  const getReviewStats = useServerFn(getSkillReviewStats);

  const { data: downloadMetrics } = useQuery({
    queryKey: ["skillDownloadMetrics", skillId],
    queryFn: () => getDownloadMetrics({ data: { skillId } }),
    refetchInterval: 60 * 60 * 1000,
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["skillReviewStats", skillId],
    queryFn: () => getReviewStats({ data: { skillId } }),
    refetchInterval: 60 * 60 * 1000,
  });

  const downloads7d = downloadMetrics?.weekly;
  const ratingAvg = reviewStats?.ratingAvg;
  const totalReviews = reviewStats?.totalReviews;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
      <StatItem
        icon={<EyeIcon className="size-3" />}
        label={m.skill_detail_metric_views()}
        value={
          viewsAllTime !== null && viewsAllTime !== undefined ? (
            formatCompactNumber(viewsAllTime, locale)
          ) : (
            <Skeleton className="h-7 w-12" />
          )
        }
      />

      <StatItem
        icon={<DownloadSimpleIcon className="size-3" />}
        label={m.skill_activity_metrics_downloads()}
        value={
          downloadsAllTime !== null && downloadsAllTime !== undefined ? (
            formatCompactNumber(downloadsAllTime, locale)
          ) : (
            <Skeleton className="h-7 w-12" />
          )
        }
        sub={
          downloads7d ? (
            <span>
              {m.skill_activity_metrics_7d()}{" "}
              <b className="text-foreground font-medium">
                {formatCompactNumber(downloads7d, locale)}
              </b>
            </span>
          ) : null
        }
      />

      <StatItem
        icon={<SealCheckIcon className="size-3" />}
        label={m.skill_detail_metric_audit_score()}
        value={typeof auditScore === "number" ? `${auditScore}/100` : "—"}
      />

      <StatItem
        icon={<StarIcon className="size-3" />}
        label={m.skill_detail_stats_rating()}
        value={
          ratingAvg && ratingAvg > 0 ? (
            ratingAvg.toFixed(1)
          ) : ratingAvg === undefined ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            "—"
          )
        }
        sub={
          totalReviews && totalReviews > 0 ? (
            <span>{m.skill_detail_stats_reviews({ count: totalReviews })}</span>
          ) : null
        }
      />

      <StatItem
        icon={<DatabaseIcon className="size-3" />}
        label={m.skill_detail_stats_size()}
        value={latestSnapshotTotalBytes ? formatFileSize(latestSnapshotTotalBytes) : "—"}
      />

      <StatItem
        icon={<CalendarBlankIcon className="size-3" />}
        label={m.skill_detail_stats_listed_since()}
        value={
          createdAt
            ? formatDate(createdAt, locale, { day: "numeric", month: "short", year: "numeric" })
            : "—"
        }
      />
    </div>
  );
};
