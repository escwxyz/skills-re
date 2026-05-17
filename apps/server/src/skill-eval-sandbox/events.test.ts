/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createSkillEvalRunEvent,
  serializeSkillEvalRunEvent,
  type SkillEvalRunEvent,
} from "./events";

describe("skill eval run events", () => {
  test("creates deterministic event ids and timestamps when provided", () => {
    const event = createSkillEvalRunEvent({
      event: {
        kind: "status",
        payload: {
          from: "queued",
          to: "running",
        },
        runId: "run-1",
      },
      nextSequence: 7,
      now: 1_700_000_000_000,
    });

    expect(event).toEqual({
      eventId: "run-1:7",
      kind: "status",
      payload: {
        from: "queued",
        to: "running",
      },
      runId: "run-1",
      sequence: 7,
      syncTime: 1_700_000_000_000,
    });
  });

  test("supports terminal, case lifecycle, artifact, policy, error, and summary events", () => {
    const events: SkillEvalRunEvent[] = [
      {
        eventId: "1",
        kind: "stdout",
        payload: { chunk: "hello" },
        runId: "run-1",
        sequence: 1,
        syncTime: 1,
      },
      {
        caseId: "case-1",
        eventId: "2",
        kind: "case_started",
        payload: { mode: "with_skill" },
        runId: "run-1",
        sequence: 2,
        syncTime: 2,
      },
      {
        caseId: "case-1",
        eventId: "3",
        kind: "case_finished",
        payload: { durationMs: 10, mode: "with_skill", score: 1, status: "pass" },
        runId: "run-1",
        sequence: 3,
        syncTime: 3,
      },
      {
        eventId: "4",
        kind: "artifact",
        payload: { key: "eval-runs/run-1/summary.json", label: "summary" },
        runId: "run-1",
        sequence: 4,
        syncTime: 4,
      },
      {
        eventId: "5",
        kind: "policy_block",
        message: "Network denied.",
        payload: { code: "NETWORK_DENIED", evidence: "fetch example.com" },
        runId: "run-1",
        sequence: 5,
        syncTime: 5,
      },
      {
        eventId: "6",
        kind: "error",
        message: "Timed out.",
        payload: { code: "RUN_TIMEOUT", terminalStatus: "fail" },
        runId: "run-1",
        sequence: 6,
        syncTime: 6,
      },
      {
        eventId: "7",
        kind: "summary",
        payload: { blockedCases: 0, failedCases: 0, passedCases: 1, totalCases: 1 },
        runId: "run-1",
        sequence: 7,
        syncTime: 7,
      },
    ];

    expect(events.map((event) => event.kind)).toEqual([
      "stdout",
      "case_started",
      "case_finished",
      "artifact",
      "policy_block",
      "error",
      "summary",
    ]);
  });

  test("serializes events as jsonl lines", () => {
    expect(
      serializeSkillEvalRunEvent({
        eventId: "run-1:1",
        kind: "stderr",
        payload: { chunk: "warning" },
        runId: "run-1",
        sequence: 1,
        syncTime: 1,
      }),
    ).toBe(
      '{"eventId":"run-1:1","kind":"stderr","payload":{"chunk":"warning"},"runId":"run-1","sequence":1,"syncTime":1}\n',
    );
  });
});
