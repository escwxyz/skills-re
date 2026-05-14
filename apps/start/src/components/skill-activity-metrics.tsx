import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { getSkillDownloadMetrics } from "@/functions/skills/get-skill-download-metrics";
import { getSkillViewMetrics } from "@/functions/skills/get-skill-view-metrics";
import { TimeValue } from "@/components/time-value";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatCompactNumber } from "@/utils/format";

interface SkillMetrics {
  allTime: number;
  daily: number;
  updatedAt: string;
  weekly: number;
}

const MetricCard = ({
  caption,
  label,
  metrics,
  value,
}: {
  caption?: string;
  label: string;
  metrics?: SkillMetrics;
  value: string;
}) => {
  const locale = getLocale();

  return (
    <div className="border-border rounded-none border bg-background/30 p-3">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-[32px] leading-none font-normal">{value}</div>
      {metrics ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">
          <span>
            {m.skill_activity_metrics_24h()}{" "}
            <b className="text-foreground font-medium">
              {formatCompactNumber(metrics.daily, locale)}
            </b>
          </span>
          <span>
            {m.skill_activity_metrics_7d()}{" "}
            <b className="text-foreground font-medium">
              {formatCompactNumber(metrics.weekly, locale)}
            </b>
          </span>
          <span>
            {m.skill_activity_metrics_updated()}{" "}
            <b className="text-foreground font-medium">
              <TimeValue locale={locale} time={metrics.updatedAt} />
            </b>
          </span>
        </div>
      ) : null}
      {caption ? (
        <div className="mt-2 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">
          {caption}
        </div>
      ) : null}
    </div>
  );
};

export const SkillActivityMetrics = ({
  auditScore,
  skillId,
}: {
  auditScore?: number | null;
  skillId: string;
}) => {
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
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={m.skill_card_metric_audit()}
          value={typeof auditScore === "number" ? `${auditScore}/100` : "—"}
        />
        <MetricCard
          label={m.skill_activity_metrics_downloads()}
          metrics={data.downloadMetrics}
          value={formatCompactNumber(data.downloadMetrics.allTime, getLocale())}
        />
        <MetricCard
          label={m.skill_detail_metric_views()}
          metrics={data.viewMetrics}
          value={formatCompactNumber(data.viewMetrics.allTime, getLocale())}
        />
      </div>
    </div>
  );
};

const SkillActivityMetricsSkeleton = () => (
  <div className="border-border border-b p-[18px_22px]">
    <Skeleton className="mb-2.5 h-2.5 w-32" />
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-border rounded-none border bg-background/30 p-3">
          <Skeleton className="mb-2 h-2.5 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-2 h-2 w-40" />
        </div>
      ))}
    </div>
  </div>
);
