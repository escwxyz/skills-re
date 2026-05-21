/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { normalizeSkillCanonicalSlug } from "./repo";

describe("skills repo helpers", () => {
  test("normalizes empty canonical slugs to null", () => {
    expect(normalizeSkillCanonicalSlug(null)).toBeNull();
    expect(normalizeSkillCanonicalSlug(undefined)).toBeNull();
    expect(normalizeSkillCanonicalSlug("")).toBeNull();
    expect(normalizeSkillCanonicalSlug("   ")).toBeNull();
  });

  test("trims non-empty canonical slugs", () => {
    expect(normalizeSkillCanonicalSlug(" widget ")).toBe("widget");
  });
});
