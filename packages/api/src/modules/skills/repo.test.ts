/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  buildSearchWhereClauses,
  keywordSearchMetadataFields,
  normalizeSkillCanonicalSlug,
} from "./repo";
import { normalizeSkillSlug } from "@skills-re/contract/common/slugs";

const createSearchDbStub = () => {
  const builder = {
    from() {
      return builder;
    },
    where() {
      return builder;
    },
  };

  return {
    select() {
      return builder;
    },
  };
};

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

  test("uses one OR keyword predicate instead of requiring author identity and skill metadata matches", () => {
    expect(
      buildSearchWhereClauses({ query: "workflow" }, createSearchDbStub() as never),
    ).toHaveLength(2);
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
