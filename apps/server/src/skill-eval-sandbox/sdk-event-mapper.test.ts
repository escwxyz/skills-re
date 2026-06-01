/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  mapAgentSkillsEvalSdkEventToRunEvents,
  parseAgentSkillsEvalSdkEventsFromStdout,
} from "./sdk-event-mapper";
import type { SkillsEvent } from "agent-skills-eval";

describe("agent-skills-eval SDK event mapper", () => {
  test("maps eval lifecycle events to normalized run events", () => {
    const start: SkillsEvent = {
      evalIndex: 0,
      evalSlug: "basic",
      fileCount: 0,
      mode: "with_skill",
      skill: "demo",
      type: "eval-start",
      user: "Do the task",
    };
    const end: SkillsEvent = {
      evalIndex: 0,
      evalSlug: "basic",
      grading: {
        assertion_results: [],
        summary: { failed: 0, pass_rate: 1, passed: 1, total: 1 },
      },
      mode: "with_skill",
      output: "done",
      skill: "demo",
      timing: { duration_ms: 42, total_tokens: 10 },
      type: "eval-end",
    };

    expect(
      mapAgentSkillsEvalSdkEventToRunEvents({
        event: start,
        nextSequence: 1,
        now: 10,
        runId: "run-1",
      }),
    ).toEqual([
      expect.objectContaining({
        caseId: "basic",
        kind: "case_started",
        payload: { mode: "with_skill" },
        sequence: 1,
      }),
    ]);

    expect(
      mapAgentSkillsEvalSdkEventToRunEvents({
        event: end,
        nextSequence: 2,
        now: 11,
        runId: "run-1",
      }),
    ).toEqual([
      expect.objectContaining({
        caseId: "basic",
        kind: "case_finished",
        payload: { durationMs: 42, mode: "with_skill", score: 1, status: "pass" },
        sequence: 2,
      }),
      expect.objectContaining({
        caseId: "basic",
        kind: "agent_message",
        payload: { content: "done", role: "assistant" },
        sequence: 3,
      }),
    ]);
  });

  test("parses SDK events emitted by the sandbox runner", () => {
    const event: SkillsEvent = {
      benchmark: {
        run_summary: {
          with_skill: {
            pass_rate: { mean: 1, stddev: 0 },
            time_seconds: { mean: 1, stddev: 0 },
            tokens: { mean: 1, stddev: 0 },
          },
        },
      },
      benchmarkPath: "/workspace/out/benchmark.json",
      skill: "demo",
      type: "suite-end",
    };

    expect(
      parseAgentSkillsEvalSdkEventsFromStdout(
        `noise\n__SKILLS_RE_SDK_EVENT__${JSON.stringify(event)}\n`,
      ),
    ).toEqual([event]);
  });
});
