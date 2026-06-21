/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind index export route", () => {
  test("rejects requests without the automation token", async () => {
    const route = (await import("./pagefind-index-export").catch(() => ({}))) as {
      createPagefindIndexExportResponse?: (
        request: Request,
        expectedToken: string,
        deps: Record<string, unknown>,
      ) => Promise<Response>;
    };

    const response = await route.createPagefindIndexExportResponse?.(
      new Request("https://api.example.com/skills/pagefind/export"),
      "secret",
      {},
    );

    expect(response?.status).toBe(401);
  });

  test("validates pagination before invoking the export service", async () => {
    const route = (await import("./pagefind-index-export").catch(() => ({}))) as {
      createPagefindIndexExportResponse?: (
        request: Request,
        expectedToken: string,
        deps: Record<string, unknown>,
      ) => Promise<Response>;
    };
    const request = new Request(
      "https://api.example.com/skills/pagefind/export?cursor=&limit=101",
      { headers: { "x-skills-automation-token": "secret" } },
    );
    const response = await route.createPagefindIndexExportResponse?.(request, "secret", {});

    expect(response?.status).toBe(400);
  });

  test("returns an authorized deterministic export page without caching", async () => {
    const { createPagefindIndexExportResponse } = await import("./pagefind-index-export");
    const response = await createPagefindIndexExportResponse(
      new Request("https://api.example.com/skills/pagefind/export?limit=25", {
        headers: { "x-skills-automation-token": "secret" },
      }),
      "secret",
      {
        exportPage: async (input, origin) => ({
          continueCursor: "",
          isDone: true,
          page: [],
          sourceWatermark: input.limit === 25 && origin === "https://api.example.com" ? 123 : 0,
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ sourceWatermark: 123 });
  });
});
