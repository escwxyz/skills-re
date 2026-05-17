/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  createSkillEvalCaseFingerprint,
  createSkillEvalSuiteFingerprint,
  parseSkillEvalSuite,
  validateSkillEvalSuite,
} from "./parser";

describe("skill eval suite parser", () => {
  test("parses the local demo skill fixture", () => {
    const content = readFileSync(
      "apps/server/src/skill-eval-sandbox/fixtures/demo-skill/evals/evals.json",
      "utf8",
    );

    expect(parseSkillEvalSuite(content)).toMatchObject({
      caseCount: 1,
      cases: [
        {
          fixturePaths: ["evals/files/note.txt"],
          id: "summarize-note",
          title: "summarize attached note",
        },
      ],
      skillName: "demo-skill",
    });
  });

  test("parses a valid evals.json file into normalized cases", () => {
    expect(
      parseSkillEvalSuite(
        JSON.stringify({
          skill_name: "Code Review",
          evals: [
            {
              assertions: ["mentions the off-by-one error"],
              expected_output: "Finds a date math bug.",
              files: ["evals/files/off-by-one.diff"],
              id: 42,
              prompt: "Review this patch.",
            },
          ],
        }),
      ),
    ).toEqual({
      caseCount: 1,
      cases: [
        {
          assertions: ["mentions the off-by-one error"],
          expectedOutput: "Finds a date math bug.",
          fixturePaths: ["evals/files/off-by-one.diff"],
          id: "42",
          prompt: "Review this patch.",
        },
      ],
      skillName: "Code Review",
    });
  });

  test("accepts SDK-compatible name and assertion-only cases", () => {
    expect(
      parseSkillEvalSuite(
        JSON.stringify({
          skill_name: "Code Review",
          evals: [
            {
              assertions: ["mentions the risky line"],
              id: "assertion-only",
              name: "assertion only",
              prompt: "Review this patch.",
            },
          ],
        }),
      ).cases[0],
    ).toEqual({
      assertions: ["mentions the risky line"],
      fixturePaths: [],
      id: "assertion-only",
      prompt: "Review this patch.",
      title: "assertion only",
    });
  });

  test("creates stable suite and case fingerprints from normalized content", async () => {
    const suite = parseSkillEvalSuite(
      JSON.stringify({
        skill_name: "Code Review",
        evals: [
          {
            expected_output: "Finds a date math bug.",
            files: ["evals/files/off-by-one.diff"],
            id: "off-by-one",
            prompt: "Review this patch.",
          },
        ],
      }),
    );

    const suiteFingerprint = await createSkillEvalSuiteFingerprint({
      snapshotId: "snapshot-1",
      snapshotVersion: "1.0.0",
      suite,
    });
    const sameSuiteFingerprint = await createSkillEvalSuiteFingerprint({
      snapshotId: "snapshot-1",
      snapshotVersion: "1.0.0",
      suite,
    });
    const nextSnapshotFingerprint = await createSkillEvalSuiteFingerprint({
      snapshotId: "snapshot-2",
      snapshotVersion: "1.0.1",
      suite,
    });

    expect(suiteFingerprint).toHaveLength(64);
    expect(suiteFingerprint).toBe(sameSuiteFingerprint);
    expect(suiteFingerprint).not.toBe(nextSnapshotFingerprint);

    const caseFingerprint = await createSkillEvalCaseFingerprint({
      caseItem: suite.cases[0]!,
      snapshotId: "snapshot-1",
      snapshotVersion: "1.0.0",
    });

    expect(caseFingerprint).toHaveLength(64);
  });

  test("validates case count, duplicate ids, prompt size, and fixture limits", () => {
    const suite = parseSkillEvalSuite(
      JSON.stringify({
        skill_name: "Code Review",
        evals: [
          {
            expected_output: "Finds a date math bug.",
            files: ["evals/files/off-by-one.diff", "evals/files/huge.diff"],
            id: "duplicate",
            prompt: "short",
          },
          {
            expected_output: "Finds a date math bug.",
            files: ["evals/files/missing.diff"],
            id: "duplicate",
            prompt: "x".repeat(16),
          },
        ],
      }),
    );

    const result = validateSkillEvalSuite({
      files: [
        { path: "evals/files/off-by-one.diff", size: 12 },
        { path: "evals/files/huge.diff", size: 128 },
      ],
      limits: {
        maxCaseCount: 1,
        maxFixtureBytes: 64,
        maxFixtureCount: 1,
        maxPromptBytes: 8,
      },
      suite,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("eval suite has 2 cases, exceeding the limit of 1");
    expect(result.errors).toContain("duplicate eval case id: duplicate");
    expect(result.errors).toContain(
      "eval case duplicate references 2 fixtures, exceeding the limit of 1",
    );
    expect(result.errors).toContain(
      "eval case duplicate fixture evals/files/huge.diff is 128 bytes, exceeding the limit of 64",
    );
    expect(result.errors).toContain(
      "eval case duplicate fixture is missing: evals/files/missing.diff",
    );
    expect(result.errors).toContain(
      "eval case duplicate prompt is 16 bytes, exceeding the limit of 8",
    );
  });

  test("accepts a suite whose cases and fixtures fit validation limits", () => {
    const suite = parseSkillEvalSuite(
      JSON.stringify({
        skill_name: "Code Review",
        evals: [
          {
            expected_output: "Finds a date math bug.",
            files: ["evals/files/off-by-one.diff"],
            id: "off-by-one",
            prompt: "Review this patch.",
          },
        ],
      }),
    );

    expect(
      validateSkillEvalSuite({
        files: [{ path: "evals/files/off-by-one.diff", size: 12 }],
        limits: {
          maxCaseCount: 2,
          maxFixtureBytes: 64,
          maxFixtureCount: 2,
          maxPromptBytes: 64,
        },
        suite,
      }),
    ).toEqual({
      errors: [],
      valid: true,
    });
  });

  test("rejects malformed eval JSON", () => {
    expect(() => parseSkillEvalSuite("{not json")).toThrow();
  });

  test("rejects eval cases with missing required fields", () => {
    expect(() =>
      parseSkillEvalSuite(
        JSON.stringify({
          skill_name: "Code Review",
          evals: [
            {
              expected_output: "Finds a date math bug.",
              id: "missing-prompt",
            },
          ],
        }),
      ),
    ).toThrow();
  });

  test("rejects cases without expected output or assertions", () => {
    expect(() =>
      parseSkillEvalSuite(
        JSON.stringify({
          skill_name: "Code Review",
          evals: [
            {
              id: "missing-rubric",
              prompt: "Review this patch.",
            },
          ],
        }),
      ),
    ).toThrow("expected_output");
  });
});
