import { m } from "@/paraglide/messages";

interface InitialData {
  runs: {
    continueCursor: string;
    isDone: boolean;
    page: {
      agent: {
        displayName: string;
      };
      completedAt: number | null;
      createdAt: number;
      id: string;
      status: string;
      summary: {
        blockedCases: number;
        failedCases: number;
        passedCases: number;
        totalCases: number;
      };
      totalDurationMs?: number;
    }[];
  };
  suite: {
    caseCount: number;
    status: "invalid" | "missing" | "valid";
  };
}

interface Props {
  detailHrefForRun?: (runId: string) => string;
  initialData: InitialData;
}

export const aggregateEvalHistoryStats = (runs: InitialData["runs"]["page"]) => {
  const summary = {
    blockedCases: 0,
    failedCases: 0,
    passedCases: 0,
    totalCases: 0,
    totalRuns: 0,
  };

  for (const run of runs) {
    summary.blockedCases += run.summary.blockedCases;
    summary.failedCases += run.summary.failedCases;
    summary.passedCases += run.summary.passedCases;
    summary.totalCases += run.summary.totalCases;
    summary.totalRuns += 1;
  }

  return summary;
};

const formatDate = (value: number) => new Date(value).toLocaleString();

const formatDuration = (value?: number) => {
  if (typeof value !== "number") {
    return m.skill_eval_pending();
  }
  if (value < 1000) {
    return `${value}ms`;
  }
  return `${(value / 1000).toFixed(1)}s`;
};

export function SkillEvalHistoryPanel({ detailHrefForRun, initialData }: Props) {
  const stats = aggregateEvalHistoryStats(initialData.runs.page);
  const hasRuns = initialData.runs.page.length > 0;

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-350 gap-6">
        <div className="grid border border-border md:grid-cols-4">
          {[
            [m.skill_eval_runs(), stats.totalRuns],
            [m.skill_eval_passed(), stats.passedCases],
            [m.skill_eval_failed_cases(), stats.failedCases],
            [m.skill_eval_blocked_cases(), stats.blockedCases],
          ].map(([label, value]) => (
            <div key={label} className="border-border border-b p-5 md:border-b-0 md:border-r">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {label}
              </div>
              <div className="font-display mt-3 text-4xl font-normal">{value}</div>
            </div>
          ))}
        </div>

        {hasRuns ? (
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_120px_120px_120px] border-border border-b px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{m.skill_eval_run_label()}</span>
              <span>{m.skill_eval_run_status()}</span>
              <span>{m.skill_eval_cases()}</span>
              <span>{m.skill_eval_duration()}</span>
            </div>
            {initialData.runs.page.map((run) => (
              <article
                key={run.id}
                className="grid grid-cols-[1fr_120px_120px_120px] border-border border-b px-4 py-4 last:border-b-0"
              >
                <div>
                  <div className="font-medium">
                    {detailHrefForRun ? (
                      <a
                        className="underline-offset-4 hover:underline"
                        href={detailHrefForRun(run.id)}
                      >
                        {run.id}
                      </a>
                    ) : (
                      run.id
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {run.agent.displayName} · {formatDate(run.createdAt)}
                  </div>
                </div>
                <div className="font-mono text-sm uppercase">{run.status}</div>
                <div className="font-mono text-sm">
                  {run.summary.passedCases}/{run.summary.totalCases}
                </div>
                <div className="font-mono text-sm">{formatDuration(run.totalDurationMs)}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-border p-8">
            <h2 className="font-display m-0 text-3xl font-normal">{m.skill_eval_no_runs()}</h2>
            <p className="text-muted-foreground m-0 mt-2">
              {m.skill_eval_suite_status_prefix()} {initialData.suite.status} ·{" "}
              {initialData.suite.caseCount} {m.skill_eval_cases()}
            </p>
          </div>
        )}

        {initialData.runs.isDone ? null : (
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {m.skill_eval_more_runs_available_after()} {initialData.runs.continueCursor}
          </div>
        )}
      </div>
    </section>
  );
}
