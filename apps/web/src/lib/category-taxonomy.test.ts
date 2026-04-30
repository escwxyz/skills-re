/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getCategoryCopy, getCategoryPresentation } from "./category-taxonomy";

describe("category-taxonomy", () => {
  test("returns localized copy for a known category", () => {
    expect(getCategoryCopy("de", "operations-automation")).toEqual({
      description: "Automatisierung, Orchestrierung und wiederkehrende operative Workflows.",
      title: "Betrieb & Automatisierung",
    });

    expect(getCategoryCopy("zh-Hans", "analysis-insights")).toEqual({
      description: "将信息转化为洞察的研究、分析与综合任务。",
      title: "分析与洞察",
    });
  });

  test("falls back to other for unknown slugs", () => {
    expect(getCategoryCopy("en", "legacy-category")).toEqual({
      description: "Fallback classification for ambiguous, weak, or uncategorized items.",
      title: "Other",
    });
  });

  test("maps category presentation consistently", () => {
    expect(getCategoryPresentation("process-methodology", 4)).toEqual({
      num: "05",
      variant: "italic",
    });

    expect(getCategoryPresentation("legacy-category", 9)).toEqual({
      num: "09",
      variant: "default",
    });
  });
});
