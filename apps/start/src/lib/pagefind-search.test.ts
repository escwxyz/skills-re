/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

const validManifest = {
  bundleUrl: "https://api.example.com/pagefind/generations/123-a/pagefind/",
  generationId: "123-a",
  pagefindVersion: "1.5.2",
  publishedAt: 100,
  recordCount: 2,
  schemaVersion: 1 as const,
  sourceWatermark: 90,
};

describe("Pagefind browser search", () => {
  test("loads one immutable generation lazily and forwards filters", async () => {
    const module = (await import("./pagefind-search").catch(() => ({}))) as {
      createPagefindSearchAdapter?: (deps: Record<string, unknown>) => {
        search: (input: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const calls: Record<string, unknown>[] = [];
    let manifestLoads = 0;
    let runtimeLoads = 0;
    const adapter = module.createPagefindSearchAdapter?.({
      fetchManifest: async () => {
        manifestLoads += 1;
        return { ...validManifest, generationId: `123-${manifestLoads}` };
      },
      hydrate: async () => [],
      importRuntime: async () => {
        runtimeLoads += 1;
        return {
          init: async () => undefined,
          options: async () => undefined,
          search: async (_query: string, options: Record<string, unknown>) => {
            calls.push(options);
            return { results: [] };
          },
        };
      },
      now: () => 200,
    });

    await adapter?.search({ categories: ["search"], limit: 10, query: "pagefind", tags: ["web"] });
    await adapter?.search({ limit: 10, query: "ranking" });

    expect(manifestLoads).toBe(1);
    expect(runtimeLoads).toBe(1);
    expect(calls[0]).toEqual({ filters: { category: ["search"], tags: ["web"] } });
  });

  test("hydrates current cards in Pagefind order and omits stale hits", async () => {
    const module = await import("./pagefind-search").catch(() => ({}));
    const createAdapter = (
      module as unknown as {
        createPagefindSearchAdapter?: (deps: Record<string, unknown>) => {
          search: (input: Record<string, unknown>) => Promise<{ page: Record<string, unknown>[] }>;
        };
      }
    ).createPagefindSearchAdapter;
    const adapter = createAdapter?.({
      fetchManifest: async () => validManifest,
      hydrate: async () => [
        { description: "Second", id: "skill-2", slug: "second", title: "Second" },
        { description: "First", id: "skill-1", slug: "first", title: "First" },
      ],
      importRuntime: async () => ({
        init: async () => undefined,
        options: async () => undefined,
        search: async () => ({
          results: [
            { data: async () => ({ meta: { skillId: "skill-2" }, plain_excerpt: "two" }) },
            { data: async () => ({ meta: { skillId: "missing" }, plain_excerpt: "stale" }) },
            { data: async () => ({ meta: { skillId: "skill-1" }, plain_excerpt: "one" }) },
          ],
        }),
      }),
      now: () => 200,
    });

    const result = await adapter?.search({ limit: 2, query: "search" });

    expect(result?.page.map((item) => item.id)).toEqual(["skill-2", "skill-1"]);
    expect(result?.page[0]?.aiMatch).toMatchObject({ snippet: "two" });
  });

  test("marks search done when all Pagefind results were inspected", async () => {
    const module = await import("./pagefind-search");
    const adapter = module.createPagefindSearchAdapter({
      fetchManifest: async () => validManifest,
      hydrate: async () => [],
      importRuntime: async () => ({
        init: async () => undefined,
        options: async () => undefined,
        search: async () => ({
          results: [{ data: async () => ({ plain_excerpt: "missing metadata" }) }],
        }),
      }),
      now: () => 200,
    });

    const result = await adapter.search({ limit: 1, query: "search" });

    expect(result.isDone).toBe(true);
  });

  test("hydrates broad search hits in contract-sized batches", async () => {
    const module = await import("./pagefind-search");
    const hydrationBatches: string[][] = [];
    const hits = Array.from({ length: 72 }, (_, index) => ({
      data: async () => ({
        meta: { skillId: `skill-${index}` },
        plain_excerpt: `excerpt-${index}`,
      }),
    }));
    const adapter = module.createPagefindSearchAdapter({
      fetchManifest: async () => validManifest,
      hydrate: async (skillIds) => {
        hydrationBatches.push(skillIds);
        if (skillIds.length > 50) {
          throw new Error("Pagefind hydration contract limit exceeded");
        }
        return skillIds.map((skillId) => ({
          description: skillId,
          id: skillId,
          slug: skillId,
          title: skillId,
        }));
      },
      importRuntime: async () => ({
        init: async () => undefined,
        options: async () => undefined,
        search: async () => ({ results: hits }),
      }),
      now: () => 200,
    });

    const result = await adapter.search({ limit: 24, query: "common" });

    expect(hydrationBatches.map((batch) => batch.length)).toEqual([50, 22]);
    expect(result.page).toHaveLength(24);
    expect(result.page.at(-1)?.id).toBe("skill-23");
  });

  test("rejects an incompatible manifest before importing Pagefind", async () => {
    const module = await import("./pagefind-search").catch(() => ({}));
    const createAdapter = (
      module as unknown as {
        createPagefindSearchAdapter?: (deps: Record<string, unknown>) => {
          search: (input: Record<string, unknown>) => Promise<unknown>;
        };
      }
    ).createPagefindSearchAdapter;
    let imported = false;
    const adapter = createAdapter?.({
      fetchManifest: async () => ({ ...validManifest, schemaVersion: 2 }),
      hydrate: async () => [],
      importRuntime: async () => {
        imported = true;
        return {};
      },
      now: () => 200,
    });

    await expect(adapter?.search({ limit: 10, query: "search" })).rejects.toThrow();
    expect(imported).toBe(false);
  });
});
