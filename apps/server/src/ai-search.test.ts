/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createAiSearchRuntime } from "./ai-search";

describe("createAiSearchRuntime", () => {
  test("calls AI_SEARCH.search with correct options", async () => {
    const calls: unknown[] = [];
    const runtime = createAiSearchRuntime({
      AI_SEARCH: {
        items: {
          delete: () => Promise.resolve(),
          upload: () => Promise.resolve({ id: "item-1" }),
        },
        search(input: unknown) {
          calls.push(input);
          return Promise.resolve({ data: [], has_more: false });
        },
      },
    } as never);

    await expect(runtime.search({ query: "widget" })).resolves.toEqual({
      data: [],
      has_more: false,
    });

    expect(calls).toEqual([
      {
        ai_search_options: {
          query_rewrite: { enabled: true },
          retrieval: {
            context_expansion: 0,
            max_num_results: 10,
            retrieval_type: "hybrid",
          },
        },
        query: "widget",
      },
    ]);
  });

  test("fails fast when AI_SEARCH binding is not configured", async () => {
    const runtime = createAiSearchRuntime({} as never);

    await expect(runtime.search({ query: "secret customer data" })).rejects.toThrow(
      "AI_SEARCH binding is not configured.",
    );
  });
});
