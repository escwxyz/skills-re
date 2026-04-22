/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getSearchPageData } from "./search-data";

describe("search-data", () => {
  test("returns live search mode labels when a query is present", async () => {
    const data = await getSearchPageData(
      {
        skills: {
          search: async () => ({
            continueCursor: "",
            isDone: true,
            page: [
              {
                authorHandle: "hallie",
                description: "Diff-first review.",
                downloadsAllTime: 412000,
                id: "skill_123",
                latestVersion: "2.4.1",
                primaryCategory: "Code & Craft",
                slug: "code-review",
                title: "code-review",
              },
            ],
          }),
        },
      } as never,
      new URLSearchParams("q=review"),
    );

    expect(data.mode).toBe("search");
    expect(data.query).toBe("review");
    expect(data.resultLabel).toBe("1 live skill matches");
    expect(data.note).toContain("skills only");
    expect(data.items).toHaveLength(1);
  });

  test("returns browse mode labels when the query is empty", async () => {
    const data = await getSearchPageData(
      {
        skills: {
          search: async () => ({
            continueCursor: "",
            isDone: true,
            page: [],
          }),
        },
      } as never,
      new URLSearchParams(),
    );

    expect(data.mode).toBe("browse");
    expect(data.titleLabel).toBe("Popular skills");
    expect(data.resultLabel).toBe("0 popular skills");
  });
});
