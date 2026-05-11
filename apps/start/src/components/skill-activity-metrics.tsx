import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { getSkillDownloadMetrics } from "@/functions/skills/get-skill-download-metrics";
import { getSkillViewMetrics } from "@/functions/skills/get-skill-view-metrics";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { formatCompactNumber, formatDate } from "@/utils/format";

interface SkillMetrics {
  allTime: number;
  daily: number;
  updatedAt: string;
  weekly: number;
}

const MetricValue = (props: { label: string; value: string }) => (
  <div>
    <div className="text-muted-foreground font-mono text-[9.5px] uppercase tracking-[.16em]">
      {props.label}
    </div>
    <div className="font-display mt-1 text-[24px] leading-none">{props.value}</div>
  </div>
);

const MetricCard = ({ label, metrics }: { label: string; metrics: SkillMetrics }) => {
  const locale = getLocale();

  return (
    <div className="border-border rounded-none border bg-background/30 p-3">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted-foreground">
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricValue
          label={m.skill_activity_metrics_all_time()}
          value={formatCompactNumber(metrics.allTime, locale)}
        />
        <MetricValue
          label={m.skill_activity_metrics_24h()}
          value={formatCompactNumber(metrics.daily, locale)}
        />
        <MetricValue
          label={m.skill_activity_metrics_7d()}
          value={formatCompactNumber(metrics.weekly, locale)}
        />
      </div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">
        {m.skill_activity_metrics_updated()}{" "}
        {formatDate(new Date(metrics.updatedAt), locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
    </div>
  );
};

export const SkillActivityMetrics = ({ skillId }: { skillId: string }) => {
  const getDownloadMetrics = useServerFn(getSkillDownloadMetrics);
  const getViewMetrics = useServerFn(getSkillViewMetrics);

  const { data, isLoading } = useQuery({
    queryKey: ["skillActivityMetrics", skillId],
    queryFn: async () => {
      const [downloadMetrics, viewMetrics] = await Promise.all([
        getDownloadMetrics({ data: { skillId } }),
        getViewMetrics({ data: { skillId } }),
      ]);

      return {
        downloadMetrics,
        viewMetrics,
      };
    },
    refetchInterval: 60 * 60 * 1000,
  });

  if (isLoading) {
    return <SkillActivityMetricsSkeleton />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="border-border border-b p-[18px_22px]">
      <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
        {m.skill_activity_metrics_title()}
      </div>
      <div className="grid gap-3">
        <MetricCard label={m.skill_activity_metrics_downloads()} metrics={data.downloadMetrics} />
        <MetricCard label={m.skill_detail_metric_views()} metrics={data.viewMetrics} />
      </div>
    </div>
  );
};

const SkillActivityMetricsSkeleton = () => (
  <div className="border-border border-b p-[18px_22px]">
    <Skeleton className="mb-2.5 h-2.5 w-32" />
    <div className="grid gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border-border rounded-none border bg-background/30 p-3">
          <Skeleton className="mb-2 h-2.5 w-20" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="mt-2 h-2 w-40" />
        </div>
      ))}
    </div>
  </div>
);
