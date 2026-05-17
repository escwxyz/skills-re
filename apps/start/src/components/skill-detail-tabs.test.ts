/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { SKILL_DETAIL_TABS } from "./skill-detail-tabs";

describe("SkillDetailTabs", () => {
  test("includes sandbox and evals tabs after audit and before reviews", () => {
    expect(SKILL_DETAIL_TABS.map((tab) => tab.id)).toEqual([
      "skill.md",
      "file-tree",
      "audit",
      "sandbox",
      "evals",
      "reviews",
      "changelog",
    ]);
    expect(SKILL_DETAIL_TABS.find((tab) => tab.id === "sandbox")?.to).toBe(
      "/skills/$author/$repo/$slug/sandbox",
    );
    expect(SKILL_DETAIL_TABS.find((tab) => tab.id === "evals")?.to).toBe(
      "/skills/$author/$repo/$slug/evals",
    );
  });
});
