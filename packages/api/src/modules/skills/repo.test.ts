/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { keywordSearchMetadataFields, normalizeSkillCanonicalSlug } from "./repo";
import { normalizeSkillSlug } from "@skills-re/contract/common/slugs";

describe("skills repo helpers", () => {
  test("documents the metadata fields used by keyword search", () => {
    expect(keywordSearchMetadataFields).toEqual([
      "skill-title",
      "skill-description",
      "skill-slug",
      "repo-name",
      "author-handle",
      "author-name",
      "author-github",
    ]);
  });

  test("normalizes empty canonical slugs to null", () => {
    expect(normalizeSkillCanonicalSlug(null)).toBeNull();
    expect(normalizeSkillCanonicalSlug(undefined)).toBeNull();
    expect(normalizeSkillCanonicalSlug("")).toBeNull();
    expect(normalizeSkillCanonicalSlug("   ")).toBeNull();
  });

  test("trims non-empty canonical slugs", () => {
    expect(normalizeSkillCanonicalSlug(" widget ")).toBe("widget");
  });

  test("normalizes path-like skill names into storage-safe slugs", () => {
    expect(normalizeSkillSlug("orchestrate-side-effects/handle-side-effects")).toBe(
      "orchestrate-side-effects-handle-side-effects",
    );
    expect(normalizeSkillCanonicalSlug("orchestrate-side-effects/handle-side-effects")).toBe(
      "orchestrate-side-effects-handle-side-effects",
    );
  });
});
