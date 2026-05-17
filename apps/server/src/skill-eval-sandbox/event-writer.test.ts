/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createSkillEvalArtifactPrefix,
  createSkillEvalR2EventWriter,
  readSkillEvalRunEvents,
  type SkillEvalR2Bucket,
} from "./event-writer";

const createFakeBucket = () => {
  const objects = new Map<string, { contentType?: string; value: string }>();
  const bucket: SkillEvalR2Bucket = {
    get: (key) => {
      const object = objects.get(key);
      return Promise.resolve(object ? { text: () => Promise.resolve(object.value) } : null);
    },
    put: (key, value, options) => {
      if (typeof value !== "string") {
        throw new Error("fake bucket only accepts string values");
      }
      objects.set(key, {
        contentType: options?.httpMetadata?.contentType,
        value,
      });
      return Promise.resolve();
    },
  };

  return { bucket, objects };
};

describe("skill eval R2 event writer", () => {
  test("creates a stable run artifact prefix", () => {
    expect(createSkillEvalArtifactPrefix("run/one")).toBe("eval-runs/run/one");
    expect(createSkillEvalArtifactPrefix("run one")).toBe("eval-runs/run-one");
  });

  test("appends normalized events to events.jsonl", async () => {
    const { bucket, objects } = createFakeBucket();
    const writer = createSkillEvalR2EventWriter({
      artifactPrefix: "/eval-runs/run-1/",
      bucket,
    });

    await writer.appendEvent({
      eventId: "run-1:1",
      kind: "status",
      payload: { to: "running" },
      runId: "run-1",
      sequence: 1,
      syncTime: 1,
    });
    await writer.appendEvent({
      eventId: "run-1:2",
      kind: "summary",
      payload: { blockedCases: 0, failedCases: 0, passedCases: 1, totalCases: 1 },
      runId: "run-1",
      sequence: 2,
      syncTime: 2,
    });

    const written = objects.get("eval-runs/run-1/events.jsonl");
    expect(written?.contentType).toBe("application/x-ndjson; charset=utf-8");
    expect(written?.value.split("\n").filter(Boolean)).toHaveLength(2);
  });

  test("appends stdout and stderr logs", async () => {
    const { bucket, objects } = createFakeBucket();
    const writer = createSkillEvalR2EventWriter({
      artifactPrefix: "eval-runs/run-1",
      bucket,
    });

    await writer.appendStdout("hello");
    await writer.appendStdout(" world");
    await writer.appendStderr("warning");

    expect(objects.get("eval-runs/run-1/stdout.log")?.value).toBe("hello world");
    expect(objects.get("eval-runs/run-1/stderr.log")?.value).toBe("warning");
  });

  test("redacts event and log content before persisting", async () => {
    const { bucket, objects } = createFakeBucket();
    const writer = createSkillEvalR2EventWriter({
      artifactPrefix: "eval-runs/run-1",
      bucket,
    });

    await writer.appendStdout("token=secret-value");
    await writer.appendEvent({
      eventId: "run-1:1",
      kind: "stdout",
      payload: { chunk: "Authorization: Bearer token-value" },
      runId: "run-1",
      sequence: 1,
      syncTime: 1,
    });

    expect(objects.get("eval-runs/run-1/stdout.log")?.value).toBe("token=[REDACTED]");
    expect(objects.get("eval-runs/run-1/events.jsonl")?.value).toContain(
      "Authorization: Bearer [REDACTED]",
    );
  });

  test("replays persisted events after a sequence cursor", async () => {
    const { bucket } = createFakeBucket();
    const writer = createSkillEvalR2EventWriter({
      artifactPrefix: "eval-runs/run-1",
      bucket,
    });
    for (const sequence of [1, 2, 3]) {
      await writer.appendEvent({
        eventId: `run-1:${sequence}`,
        kind: "status",
        payload: { to: sequence === 3 ? "pass" : "running" },
        runId: "run-1",
        sequence,
        syncTime: sequence,
      });
    }

    await expect(
      readSkillEvalRunEvents({
        afterSequence: 1,
        artifactPrefix: "eval-runs/run-1",
        bucket,
        limit: 1,
      }),
    ).resolves.toMatchObject({
      events: [{ sequence: 2 }],
      isDone: false,
      nextSequence: 2,
    });
  });

  test("writes summary json and sanitized per-case artifacts", async () => {
    const { bucket, objects } = createFakeBucket();
    const writer = createSkillEvalR2EventWriter({
      artifactPrefix: "eval-runs/run-1",
      bucket,
    });

    await writer.writeSummary({ status: "pass" });
    await writer.writeCaseArtifact({
      caseId: "Case 01",
      content: "artifact",
      contentType: "text/plain",
      filename: "../result file.txt",
      mode: "with_skill",
    });

    expect(objects.get("eval-runs/run-1/summary.json")?.value).toBe('{\n  "status": "pass"\n}');
    expect(objects.get("eval-runs/run-1/cases/Case-01/with_skill/result-file.txt")?.value).toBe(
      "artifact",
    );
  });
});
