/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  sanitizeSkillEvalLogChunk,
  sanitizeSkillEvalRunEvent,
  sanitizeSkillEvalText,
} from "./redaction";

describe("skill eval redaction", () => {
  test("redacts common secret shapes before returning text", () => {
    expect(
      sanitizeSkillEvalText(
        "OPENCODE_API_KEY=secret-value Authorization: Bearer token-value password:abc",
      ).text,
    ).toBe("OPENCODE_API_KEY=[REDACTED] Authorization: Bearer [REDACTED] password:[REDACTED]");
  });

  test("truncates sanitized text with an explicit marker", () => {
    expect(sanitizeSkillEvalText("abcdef", 3)).toEqual({
      text: "abc...[truncated]",
      truncated: true,
    });
  });

  test("sanitizes nested event payloads and marks terminal chunks truncated", () => {
    const event = sanitizeSkillEvalRunEvent(
      {
        eventId: "run-1:1",
        kind: "stdout",
        message: "token=secret",
        payload: {
          chunk: "secret=abc1234567890",
        },
        runId: "run-1",
        sequence: 1,
        syncTime: 1,
      },
      18,
    );

    expect(event.message).toBe("token=[REDACTED]");
    expect(event.kind).toBe("stdout");
    if (event.kind === "stdout") {
      expect(event.payload.chunk).toBe("secret=[REDACTED]");
      expect(event.payload.truncated).toBe(false);
    }

    const truncated = sanitizeSkillEvalRunEvent(
      {
        eventId: "run-1:2",
        kind: "stderr",
        payload: {
          chunk: "a".repeat(20),
        },
        runId: "run-1",
        sequence: 2,
        syncTime: 2,
      },
      5,
    );

    expect(truncated.kind).toBe("stderr");
    if (truncated.kind === "stderr") {
      expect(truncated.payload.truncated).toBe(true);
    }
  });

  test("uses a larger default limit for persisted log chunks", () => {
    expect(sanitizeSkillEvalLogChunk("a".repeat(5), 3)).toEqual({
      text: "aaa...[truncated]",
      truncated: true,
    });
  });
});
