/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { shouldApplySearchRateLimit } from "./search-rate-limit-mode";

const jsonRequest = (body: unknown) =>
  new Request("https://skills.re/skills/search", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

describe("shouldApplySearchRateLimit", () => {
  test("bypasses rate limiting for explicit keyword search requests", async () => {
    await expect(
      shouldApplySearchRateLimit(jsonRequest({ query: "workflow", searchMode: "keyword" })),
    ).resolves.toBe(false);
    await expect(
      shouldApplySearchRateLimit(
        jsonRequest({ json: { query: "workflow", searchMode: "keyword" } }),
      ),
    ).resolves.toBe(false);
  });

  test("applies rate limiting for semantic and omitted-mode query requests", async () => {
    await expect(
      shouldApplySearchRateLimit(jsonRequest({ query: "workflow", searchMode: "semantic" })),
    ).resolves.toBe(true);
    await expect(shouldApplySearchRateLimit(jsonRequest({ query: "workflow" }))).resolves.toBe(
      true,
    );
  });

  test("fails closed for unparseable request bodies", async () => {
    await expect(
      shouldApplySearchRateLimit(
        new Request("https://skills.re/skills/search", {
          body: "not-json",
          method: "POST",
        }),
      ),
    ).resolves.toBe(true);
  });
});
