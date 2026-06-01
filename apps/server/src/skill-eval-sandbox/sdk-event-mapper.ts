import type { SkillsEvent } from "agent-skills-eval";
import type { SkillEvalRunEvent } from "./events";
import { createSkillEvalRunEvent } from "./events";

const toCaseId = (event: Extract<SkillsEvent, { type: "eval-start" | "eval-end" }>) =>
  String(event.evalId ?? event.evalSlug);

const toMode = (mode: "with_skill" | "without_skill") =>
  mode === "without_skill" ? "baseline" : "with_skill";

const toCaseStatus = (event: Extract<SkillsEvent, { type: "eval-end" }>) =>
  event.grading.summary.failed > 0 ? "fail" : "pass";

export const mapAgentSkillsEvalSdkEventToRunEvents = (input: {
  event: SkillsEvent;
  nextSequence: number;
  now?: number;
  runId: string;
}): SkillEvalRunEvent[] => {
  const base = {
    nextSequence: input.nextSequence,
    now: input.now,
  };

  if (input.event.type === "suite-start") {
    return [
      createSkillEvalRunEvent({
        ...base,
        event: {
          kind: "status",
          message: `Running ${input.event.evalsCount} eval cases for ${input.event.skill}`,
          payload: { to: "running" },
          runId: input.runId,
        },
      }),
    ];
  }

  if (input.event.type === "eval-start") {
    return [
      createSkillEvalRunEvent({
        ...base,
        event: {
          caseId: toCaseId(input.event),
          kind: "case_started",
          message: input.event.evalName,
          payload: { mode: toMode(input.event.mode) },
          runId: input.runId,
        },
      }),
    ];
  }

  if (input.event.type === "eval-end") {
    return [
      createSkillEvalRunEvent({
        ...base,
        event: {
          caseId: toCaseId(input.event),
          kind: "case_finished",
          message: input.event.evalName,
          payload: {
            durationMs: input.event.timing.duration_ms,
            mode: toMode(input.event.mode),
            score: input.event.grading.summary.pass_rate,
            status: toCaseStatus(input.event),
          },
          runId: input.runId,
        },
      }),
      createSkillEvalRunEvent({
        ...base,
        event: {
          caseId: toCaseId(input.event),
          kind: "agent_message",
          payload: {
            content: input.event.output,
            role: "assistant",
          },
          runId: input.runId,
        },
        nextSequence: input.nextSequence + 1,
      }),
    ];
  }

  return [
    createSkillEvalRunEvent({
      ...base,
      event: {
        kind: "artifact",
        message: `SDK benchmark for ${input.event.skill}`,
        payload: {
          contentType: "application/json",
          key: input.event.benchmarkPath,
          label: "Agent Skills Eval benchmark",
        },
        runId: input.runId,
      },
    }),
  ];
};

export const parseAgentSkillsEvalSdkEventsFromStdout = (stdout: string): SkillsEvent[] => {
  const prefix = "__SKILLS_RE_SDK_EVENT__";
  const events: SkillsEvent[] = [];

  for (const line of stdout.split("\n")) {
    if (!line.startsWith(prefix)) {
      continue;
    }

    try {
      events.push(JSON.parse(line.slice(prefix.length)) as SkillsEvent);
    } catch (error) {
      console.warn("Skipping malformed SDK event line.", error);
    }
  }

  return events;
};
