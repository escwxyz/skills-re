/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildSnapshotLineDiff } from "@/utils/skill-diff";

describe("skill diff helpers", () => {
  test("builds a line diff with additions and removals", () => {
    const diff = buildSnapshotLineDiff(
      ["alpha", "beta", "shared", "omega"].join("\n"),
      ["alpha", "gamma", "shared", "delta"].join("\n"),
    );

    expect(diff.summary).toEqual({
      added: 2,
      context: 2,
      removed: 2,
    });
    expect(diff.lines).toEqual([
      {
        kind: "context",
        leftLineNumber: 1,
        rightLineNumber: 1,
        text: "alpha",
      },
      {
        kind: "removed",
        leftLineNumber: 2,
        text: "beta",
      },
      {
        kind: "added",
        rightLineNumber: 2,
        text: "gamma",
      },
      {
        kind: "context",
        leftLineNumber: 3,
        rightLineNumber: 3,
        text: "shared",
      },
      {
        kind: "removed",
        leftLineNumber: 4,
        text: "omega",
      },
      {
        kind: "added",
        rightLineNumber: 4,
        text: "delta",
      },
    ]);
  });
});
