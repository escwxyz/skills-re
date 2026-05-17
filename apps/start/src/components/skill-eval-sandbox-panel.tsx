// oxlint-disable unicorn/prefer-add-event-listener
// oxlint-disable no-nested-ternary
import { useMemo, useState } from "react";
import { m } from "@/paraglide/messages";

interface InitialData {
  agents: {
    displayName: string;
    id: string;
    provider: string;
  }[];
  latestRun: {
    id: string;
    status: string;
  } | null;
  skill: {
    id: string;
  };
  suite: {
    caseCount: number;
    cases: {
      id: string;
      promptPreview: string;
      title?: string;
    }[];
    status: "invalid" | "missing" | "valid";
    validationErrors: string[];
  };
}

interface Props {
  initialData: InitialData;
  selectedSnapshotId?: string;
  serverOrigin?: string;
}

interface TerminalLine {
  id: string;
  text: string;
  tone?: "error" | "muted";
}

const getFallbackServerOrigin = () => globalThis.location?.origin ?? "http://localhost";

export const buildSkillEvalStreamUrl = (
  runId: string,
  serverOrigin = getFallbackServerOrigin(),
) => {
  const url = new URL(`/skill-eval-sandbox/runs/${encodeURIComponent(runId)}/stream`, serverOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
};

export const getRunButtonLabel = (status: string) =>
  status === "creating" ? m.skill_eval_creating() : m.skill_eval_run_eval();

export const formatSkillEvalEventLine = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return String(value ?? "");
  }

  const event = value as {
    kind?: string;
    message?: string;
    payload?: {
      chunk?: string;
      status?: string;
      to?: string;
    };
  };

  if ((event.kind === "stdout" || event.kind === "stderr") && event.payload?.chunk) {
    return event.payload.chunk;
  }
  if (event.kind === "status" && event.payload?.to) {
    return `status: ${event.payload.to}`;
  }
  return event.message ?? event.kind ?? "";
};

export const getDefaultSelectedCaseIds = (initialData: InitialData) =>
  initialData.suite.cases.map((caseItem) => caseItem.id);

export function SkillEvalSandboxPanel({ initialData, selectedSnapshotId, serverOrigin }: Props) {
  const [agentId, setAgentId] = useState(initialData.agents[0]?.id ?? "");
  const [includeBaseline, setIncludeBaseline] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState(() =>
    getDefaultSelectedCaseIds(initialData),
  );
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [runId, setRunId] = useState(initialData.latestRun?.id ?? "");
  const [status, setStatus] = useState(initialData.latestRun?.status ?? "idle");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const canRun = initialData.suite.status === "valid" && agentId && selectedCaseIds.length > 0;
  const suiteBlocked = initialData.suite.status !== "valid";
  const hasAgents = initialData.agents.length > 0;
  const selectedCaseIdSet = useMemo(() => new Set(selectedCaseIds), [selectedCaseIds]);

  const appendLine = (text: string, tone?: TerminalLine["tone"]) => {
    setTerminalLines((lines) => [
      ...lines.slice(-199),
      {
        id: `${Date.now()}:${lines.length}`,
        text,
        tone,
      },
    ]);
  };

  const toggleCase = (caseId: string) => {
    setSelectedCaseIds((current) =>
      current.includes(caseId) ? current.filter((id) => id !== caseId) : [...current, caseId],
    );
    setScope("selected");
  };

  const startRun = async () => {
    if (!canRun) {
      return;
    }

    setStatus("creating");
    setTerminalLines([]);
    try {
      const { orpcClient } = await import("@/lib/orpc");
      const created = await orpcClient.skillEvalSandbox.createRun({
        agentId,
        caseIds: scope === "selected" ? selectedCaseIds : undefined,
        includeBaseline,
        skillId: initialData.skill.id,
        snapshotId: selectedSnapshotId,
      });
      setRunId(created.runId);
      setStatus(created.status);
      appendLine(`run: ${created.runId}`, "muted");

      const socket = new WebSocket(buildSkillEvalStreamUrl(created.runId, serverOrigin));
      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));
          const line = formatSkillEvalEventLine(parsed);
          if (line) {
            appendLine(
              line,
              parsed.kind === "stderr" || parsed.kind === "error" ? "error" : undefined,
            );
          }
          if (parsed.kind === "status" && parsed.payload?.to) {
            setStatus(parsed.payload.to);
          }
        } catch {
          appendLine(String(event.data));
        }
      };
      socket.onerror = () => appendLine(m.skill_eval_stream_disconnected(), "error");
    } catch (error) {
      setStatus("failed");
      appendLine(error instanceof Error ? error.message : "Run creation failed.", "error");
    }
  };

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-350 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-border grid gap-5 border p-5">
          <div>
            <h2 className="font-display m-0 text-3xl font-normal">Sandbox</h2>
            <p className="text-muted-foreground m-0 mt-2 font-mono text-xs uppercase tracking-[0.24em]">
              {initialData.suite.status} · {initialData.suite.caseCount} cases
            </p>
          </div>

          {suiteBlocked ? (
            <div className="border-editorial-red/40 bg-editorial-red/5 text-editorial-red border p-3 text-sm">
              {initialData.suite.status === "missing"
                ? m.skill_eval_missing_suite()
                : initialData.suite.validationErrors.join(" ") || m.skill_eval_validation_failed()}
            </div>
          ) : null}

          {hasAgents ? null : (
            <div className="border-border bg-muted/30 border p-3 text-sm">
              {m.skill_eval_disabled_agents()}
            </div>
          )}

          <label className="grid gap-2 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {m.skill_eval_agent_label()}
            </span>
            <select
              className="border-border bg-background h-10 border px-3"
              disabled={!hasAgents}
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
            >
              {initialData.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {m.skill_eval_scope_label()}
            </span>
            <div className="grid grid-cols-2 border border-border">
              <button
                className={`h-10 border-r border-border ${scope === "all" ? "bg-primary text-primary-foreground" : ""}`}
                type="button"
                onClick={() => setScope("all")}
              >
                {m.skill_eval_all_cases()}
              </button>
              <button
                className={`h-10 ${scope === "selected" ? "bg-primary text-primary-foreground" : ""}`}
                type="button"
                onClick={() => setScope("selected")}
              >
                {m.skill_eval_selected_cases()}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              checked={includeBaseline}
              type="checkbox"
              onChange={(event) => setIncludeBaseline(event.target.checked)}
            />
            {m.skill_eval_run_baseline()}
          </label>

          <div className="grid max-h-64 gap-2 overflow-auto border border-border p-3">
            {/** todo: Form */}
            {initialData.suite.cases.map((caseItem) => (
              <label key={caseItem.id} className="flex items-start gap-3 text-sm">
                <input
                  checked={selectedCaseIdSet.has(caseItem.id)}
                  type="checkbox"
                  onChange={() => toggleCase(caseItem.id)}
                />
                <span>
                  <span className="block font-medium">{caseItem.title ?? caseItem.id}</span>
                  <span className="text-muted-foreground line-clamp-2">
                    {caseItem.promptPreview}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button
            className="bg-primary text-primary-foreground h-11 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canRun || status === "creating"}
            type="button"
            onClick={startRun}
          >
            {getRunButtonLabel(status)}
          </button>
        </div>

        <div className="border-border grid min-h-120 grid-rows-[auto_1fr] border bg-black text-white">
          <div className="flex items-center justify-between border-white/15 border-b px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-white/60">
            <span>{status}</span>
            <span>{runId || m.skill_eval_no_run()}</span>
          </div>
          <pre className="m-0 overflow-auto p-4 font-mono text-sm leading-6">
            {terminalLines.length > 0
              ? terminalLines.map((line) => (
                  <span
                    key={line.id}
                    className={
                      line.tone === "error"
                        ? "text-red-300"
                        : line.tone === "muted"
                          ? "text-white/50"
                          : ""
                    }
                  >
                    {line.text}
                    {"\n"}
                  </span>
                ))
              : `${m.skill_eval_waiting()}\n`}
          </pre>
        </div>
      </div>
    </section>
  );
}
