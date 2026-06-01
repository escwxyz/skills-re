// oxlint-disable unicorn/prefer-add-event-listener
// oxlint-disable no-nested-ternary
import { useState } from "react";
import { m } from "@/paraglide/messages";
import { Field, FieldLabel, Form } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppForm } from "@/hooks/form-hook";

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

interface SkillEvalSandboxFormValues {
  agentId: string;
  includeBaseline: boolean;
  scope: "all" | "selected";
  selectedCaseIds: string[];
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
  const [runId, setRunId] = useState(initialData.latestRun?.id ?? "");
  const [status, setStatus] = useState(initialData.latestRun?.status ?? "idle");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const suiteBlocked = initialData.suite.status !== "valid";
  const hasAgents = initialData.agents.length > 0;
  const defaultValues: SkillEvalSandboxFormValues = {
    agentId: initialData.agents[0]?.id ?? "",
    includeBaseline: false,
    scope: "all",
    selectedCaseIds: getDefaultSelectedCaseIds(initialData),
  };
  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await startRun(value);
    },
  });

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
    const current = form.getFieldValue("selectedCaseIds");
    const nextSelectedCaseIds = current.includes(caseId)
      ? current.filter((id) => id !== caseId)
      : [...current, caseId];

    form.setFieldValue("selectedCaseIds", nextSelectedCaseIds);
    form.setFieldValue("scope", "selected");
  };

  const startRun = async (values: SkillEvalSandboxFormValues) => {
    if (
      initialData.suite.status !== "valid" ||
      !values.agentId ||
      (values.scope === "selected" && values.selectedCaseIds.length === 0)
    ) {
      return;
    }

    setStatus("creating");
    setTerminalLines([]);
    try {
      const { orpcClient } = await import("@/lib/orpc");
      const created = await orpcClient.skillEvalSandbox.createRun({
        agentId: values.agentId,
        caseIds: values.scope === "selected" ? values.selectedCaseIds : undefined,
        includeBaseline: values.includeBaseline,
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
      <form.AppForm>
        <Form className="mx-auto grid max-w-350 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
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
                  : initialData.suite.validationErrors.join(" ") ||
                    m.skill_eval_validation_failed()}
              </div>
            ) : null}

            {hasAgents ? null : (
              <div className="border-border bg-muted/30 border p-3 text-sm">
                {m.skill_eval_disabled_agents()}
              </div>
            )}

            <form.AppField name="agentId">
              {(field) => (
                <Field className="grid gap-2 text-sm">
                  <FieldLabel className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {m.skill_eval_agent_label()}
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.handleChange(value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 w-full border-border bg-background px-3">
                      <SelectValue>
                        {(value: string | null) =>
                          initialData.agents.find((agent) => agent.id === value)?.displayName ??
                          m.skill_eval_agent_label()
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {initialData.agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="scope">
              {(field) => (
                <Field className="grid gap-2">
                  <FieldLabel className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {m.skill_eval_scope_label()}
                  </FieldLabel>
                  <div className="grid grid-cols-2 border border-border">
                    <button
                      className={`h-10 border-r border-border ${field.state.value === "all" ? "bg-primary text-primary-foreground" : ""}`}
                      type="button"
                      onClick={() => field.handleChange("all")}
                    >
                      {m.skill_eval_all_cases()}
                    </button>
                    <button
                      className={`h-10 ${field.state.value === "selected" ? "bg-primary text-primary-foreground" : ""}`}
                      type="button"
                      onClick={() => field.handleChange("selected")}
                    >
                      {m.skill_eval_selected_cases()}
                    </button>
                  </div>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="includeBaseline">
              {(field) => (
                <Field>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      aria-label={m.skill_eval_run_baseline()}
                      checked={field.state.value}
                      type="checkbox"
                      onChange={(event) => field.handleChange(event.target.checked)}
                    />
                    {m.skill_eval_run_baseline()}
                  </label>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="selectedCaseIds">
              {(field) => {
                const selectedIds = field.state.value;
                const selectedIdSet = new Set(selectedIds);

                return (
                  <Field className="grid max-h-64 gap-2 overflow-auto border border-border p-3">
                    {initialData.suite.cases.map((caseItem) => (
                      <Field key={caseItem.id}>
                        <FieldLabel className="flex items-start gap-3 text-sm">
                          <input
                            aria-label={caseItem.title ?? caseItem.id}
                            checked={selectedIdSet.has(caseItem.id)}
                            type="checkbox"
                            onChange={() => toggleCase(caseItem.id)}
                          />
                          <span>
                            <span className="block font-medium">
                              {caseItem.title ?? caseItem.id}
                            </span>
                            <span className="text-muted-foreground line-clamp-2">
                              {caseItem.promptPreview}
                            </span>
                          </span>
                        </FieldLabel>
                      </Field>
                    ))}
                  </Field>
                );
              }}
            </form.AppField>

            <form.Subscribe
              selector={(state) => ({
                agentId: state.values.agentId,
                scope: state.values.scope,
                selectedCaseIds: state.values.selectedCaseIds,
              })}
            >
              {({
                agentId: currentAgentId,
                scope: currentScope,
                selectedCaseIds: currentCaseIds,
              }) => (
                <button
                  className="bg-primary text-primary-foreground h-11 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    status === "creating" ||
                    initialData.suite.status !== "valid" ||
                    !currentAgentId ||
                    (currentScope === "selected" && currentCaseIds.length === 0)
                  }
                  type="submit"
                >
                  {getRunButtonLabel(status)}
                </button>
              )}
            </form.Subscribe>
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
        </Form>
      </form.AppForm>
    </section>
  );
}
