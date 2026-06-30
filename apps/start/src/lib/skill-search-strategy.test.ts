/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("skill search strategy", () => {
  test("uses Pagefind only for enabled keyword queries", async () => {
    const strategy = (await import("./skill-search-strategy").catch(() => ({}))) as {
      executeSkillSearch?: (input: Record<string, unknown>) => Promise<unknown>;
    };
    const calls: string[] = [];
    await strategy.executeSkillSearch?.({
      pagefindEnabled: true,
      pagefindSearch: async () => {
        calls.push("pagefind");
        return { page: [] };
      },
      query: "workflow",
      searchMode: "keyword",
      serverSearch: async () => {
        calls.push("server");
        return { page: [] };
      },
    });

    expect(calls).toEqual(["pagefind"]);
  });

  test("falls back to SQL keyword search without invoking semantic mode", async () => {
    const strategy = await import("./skill-search-strategy").catch(() => ({}));
    const execute = (
      strategy as unknown as {
        executeSkillSearch?: (input: Record<string, unknown>) => Promise<unknown>;
      }
    ).executeSkillSearch;
    const serverModes: string[] = [];
    const result = await execute?.({
      pagefindEnabled: true,
      pagefindSearch: async () => {
        throw new Error("wasm failed");
      },
      query: "workflow",
      searchMode: "keyword",
      serverSearch: async (mode: string) => {
        serverModes.push(mode);
        return { page: [], status: "sql-fallback" };
      },
    });

    expect(serverModes).toEqual(["keyword"]);
    expect(result).toMatchObject({ degraded: true, status: "sql-fallback" });
  });

  test("keeps semantic search on the server", async () => {
    const strategy = await import("./skill-search-strategy").catch(() => ({}));
    const execute = (
      strategy as unknown as {
        executeSkillSearch?: (input: Record<string, unknown>) => Promise<unknown>;
      }
    ).executeSkillSearch;
    const calls: string[] = [];
    await execute?.({
      pagefindEnabled: true,
      pagefindSearch: async () => calls.push("pagefind"),
      query: "build an agent",
      searchMode: "semantic",
      serverSearch: async (mode: string) => calls.push(mode),
    });

    expect(calls).toEqual(["semantic"]);
  });
});
