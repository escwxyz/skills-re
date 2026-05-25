/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { canCreateFeedbackAnonymously } from "./index";

describe("feedback create auth gate", () => {
  test("allows anonymous Skill reports only", () => {
    expect(canCreateFeedbackAnonymously("skill_issue")).toBe(true);
    expect(canCreateFeedbackAnonymously("skill_display")).toBe(true);
    expect(canCreateFeedbackAnonymously("skill_takedown")).toBe(true);
    expect(canCreateFeedbackAnonymously("bug")).toBe(false);
    expect(canCreateFeedbackAnonymously("request")).toBe(false);
    expect(canCreateFeedbackAnonymously("general")).toBe(false);
    expect(canCreateFeedbackAnonymously(undefined)).toBe(false);
    expect(canCreateFeedbackAnonymously(null)).toBe(false);
  });
});
