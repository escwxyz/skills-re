/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asEvaluationId, asSnapshotId, createId } from "./id";

describe("database id helpers", () => {
  test("returns the same value when branding a snapshot id", () => {
    const snapshotId = asSnapshotId("snap_123");
    expect(String(snapshotId)).toBe("snap_123");
  });

  test("returns the same value when branding an evaluation id", () => {
    const evaluationId = asEvaluationId("eval_123");
    expect(String(evaluationId)).toBe("eval_123");
  });

  test("creates a non-empty db id", () => {
    expect(createId()).toHaveLength(21);
  });
});
