/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getSearchPageData } from "./search-data";

describe("search-data", () => {
  test("returns live search mode labels when a query is present", async () => {
    const data = await getSearchPageData(
      {
        skills: {
          search: () => ({
            continueCursor: "",
            isDone: true,
            page: [
              {
                authorHandle: "hallie",
                description: "Diff-first review.",
                downloadsAllTime: 412_000,
                id: "skill_123",
                latestVersion: "2.4.1",
                primaryCategory: "code-frameworks",
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
    expect(data.resultLabel).toBe("1 AI matches");
    expect(data.note).toBe("");
    expect(data.items).toHaveLength(1);
  });

  test("returns browse mode labels when the query is empty", async () => {
    const data = await getSearchPageData({} as never, new URLSearchParams());

    expect(data.mode).toBe("browse");
    expect(data.titleLabel).toBe("Search skills");
    expect(data.resultLabel).toBe("");
    expect(data.items).toHaveLength(0);
  });
});
