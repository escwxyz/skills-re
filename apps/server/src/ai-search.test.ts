/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createAiSearchRuntime } from "./ai-search";

describe("createAiSearchRuntime", () => {
  test("prefers the AI binding when available", async () => {
    const calls: unknown[] = [];
    const runtime = createAiSearchRuntime({
      AI: {
        autorag(instanceName: string) {
          calls.push(instanceName);
          return {
            search(input: unknown) {
              calls.push(input);
              return Promise.resolve({
                data: [],
                has_more: false,
              });
            },
          };
        },
      },
      RAG_ID: "skills-search",
    } as never);

    await expect(
      runtime.search({
        query: "widget",
      }),
    ).resolves.toEqual({
      data: [],
      has_more: false,
    });

    expect(calls).toEqual([
      "skills-search",
      {
        ai_search_options: {
          query_rewrite: {
            enabled: true,
          },
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

  test("fails fast when no AI binding is configured", async () => {
    const runtime = createAiSearchRuntime({} as never);

    await expect(
      runtime.search({
        query: "secret customer data",
      }),
    ).rejects.toThrow('AI Search binding is not configured for instance "curly-voice-daf4".');
  });
});
