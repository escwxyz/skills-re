/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("skill search strategy", () => {
  test("uses the server for keyword queries", async () => {
    const strategy = (await import("./skill-search-strategy").catch(() => ({}))) as {
      executeSkillSearch?: (input: Record<string, unknown>) => Promise<unknown>;
    };
    const calls: string[] = [];
    await strategy.executeSkillSearch?.({
      query: "workflow",
      searchMode: "keyword",
      serverSearch: async (mode: string) => {
        calls.push(mode);
        return { page: [] };
      },
    });

    expect(calls).toEqual(["keyword"]);
  });

  test("does not mark keyword server results as degraded", async () => {
    const strategy = await import("./skill-search-strategy").catch(() => ({}));
    const execute = (
      strategy as unknown as {
        executeSkillSearch?: (input: Record<string, unknown>) => Promise<unknown>;
      }
    ).executeSkillSearch;
    const serverModes: string[] = [];
    const result = await execute?.({
      query: "workflow",
      searchMode: "keyword",
      serverSearch: async (mode: string) => {
        serverModes.push(mode);
        return { page: [], status: "server" };
      },
    });

    expect(serverModes).toEqual(["keyword"]);
    expect(result).toMatchObject({ status: "server" });
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
      query: "build an agent",
      searchMode: "semantic",
      serverSearch: async (mode: string) => calls.push(mode),
    });

    expect(calls).toEqual(["semantic"]);
  });
});
