/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { CATEGORY_DEFINITIONS, CATEGORY_SLUGS } from "./taxonomy";

describe("category taxonomy", () => {
  test("exposes the fixed slug set used by the classifier", () => {
    expect(CATEGORY_SLUGS).toEqual([
      "code-frameworks",
      "tools-platforms",
      "analysis-insights",
      "design-creative",
      "process-methodology",
      "communication-strategy",
      "domain-expertise",
      "operations-automation",
      "other",
    ]);
  });

  test("keeps every definition on the same contract", () => {
    expect(CATEGORY_DEFINITIONS.every((definition) => definition.slug.length > 0)).toBe(true);
    expect(CATEGORY_DEFINITIONS.every((definition) => definition.nameKey.length > 0)).toBe(true);
    expect(CATEGORY_DEFINITIONS.every((definition) => definition.descriptionKey.length > 0)).toBe(
      true,
    );
    expect(CATEGORY_DEFINITIONS.every((definition) => definition.parentSlug === null)).toBe(true);
  });
});
