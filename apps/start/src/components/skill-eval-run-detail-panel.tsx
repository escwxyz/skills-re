import { m } from "@/paraglide/messages";

interface RunDetail {
  agent: {
    displayName: string;
    provider: string;
  };
  artifactPrefix: string;
  caseResults: {
    artifacts: {
      key: string;
      label: string;
    }[];
    baseline?: {
      durationMs?: number;
      errorCode?: string;
      errorMessage?: string;
      exitCode?: number;
      outputPreview?: string;
      score?: number;
      status: string;
      tokenCount?: number;
    } | null;
    caseId: string;
    status: string;
    summary?: string;
    withSkill: {
      durationMs?: number;
      errorCode?: string;
      errorMessage?: string;
      exitCode?: number;
      outputPreview?: string;
      score?: number;
      status: string;
      tokenCount?: number;
    };
  }[];
  completedAt: number | null;
  id: string;
  status: string;
  summary: {
    blockedCases: number;
    failedCases: number;
    passedCases: number;
    totalCases: number;
  };
  tokenCount?: number;
  totalDurationMs?: number;
}

interface Props {
  detail: RunDetail;
}

const formatScore = (value?: number) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";

const formatDuration = (value?: number) => {
  if (typeof value !== "number") {
    return m.skill_eval_pending();
  }
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
};

const ModeResult = ({
  label,
  result,
}: {
  label: string;
  result:
    | NonNullable<RunDetail["caseResults"][number]["baseline"]>
    | RunDetail["caseResults"][number]["withSkill"];
}) => (
  <div className="border-border border p-4">
    <div className="flex items-center justify-between gap-4">
      <h3 className="m-0 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </h3>
      <span className="font-mono text-xs uppercase">{result.status}</span>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs">
      <span>score {formatScore(result.score)}</span>
      <span>exit {result.exitCode ?? "n/a"}</span>
      <span>{formatDuration(result.durationMs)}</span>
    </div>
    {result.outputPreview ? (
      <pre className="mt-4 max-h-52 overflow-auto bg-black p-3 text-sm leading-6 text-white">
        {result.outputPreview}
      </pre>
    ) : null}
    {result.errorCode || result.errorMessage ? (
      <p className="text-editorial-red m-0 mt-3 text-sm">
        {result.errorCode ? `${result.errorCode}: ` : ""}
        {result.errorMessage}
      </p>
    ) : null}
  </div>
);

export function SkillEvalRunDetailPanel({ detail }: Props) {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-350 gap-6">
        <header className="border-border border p-5">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {detail.agent.displayName} · {detail.agent.provider}
          </div>
          <h2 className="font-display m-0 mt-3 text-4xl font-normal">{detail.id}</h2>
          <div className="mt-4 grid gap-3 font-mono text-sm md:grid-cols-5">
            <span>{detail.status}</span>
            <span>
              {detail.summary.passedCases}/{detail.summary.totalCases} passed
            </span>
            <span>{detail.summary.failedCases} failed</span>
            <span>{detail.summary.blockedCases} blocked</span>
            <span>{formatDuration(detail.totalDurationMs)}</span>
          </div>
        </header>

        <div className="grid gap-5">
          {detail.caseResults.map((caseResult) => (
            <article key={caseResult.caseId} className="grid gap-4 border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="m-0 text-xl font-medium">{caseResult.caseId}</h3>
                  {caseResult.summary ? (
                    <p className="text-muted-foreground m-0 mt-1">{caseResult.summary}</p>
                  ) : null}
                </div>
                <span className="font-mono text-sm uppercase">{caseResult.status}</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ModeResult label={m.skill_eval_with_skill()} result={caseResult.withSkill} />
                {caseResult.baseline ? (
                  <ModeResult label={m.skill_eval_baseline()} result={caseResult.baseline} />
                ) : (
                  <div className="border-border border p-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {m.skill_eval_baseline_not_run()}
                  </div>
                )}
              </div>

              {caseResult.artifacts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {caseResult.artifacts.map((artifact) => (
                    <span
                      key={artifact.key}
                      className="border-border border px-2 py-1 font-mono text-xs"
                    >
                      {artifact.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {m.skill_eval_artifacts_label({ artifactPrefix: detail.artifactPrefix })}
        </div>
      </div>
    </section>
  );
}
