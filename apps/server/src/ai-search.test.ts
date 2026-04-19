/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createAiSearchRuntime } from "./ai-search";

describe("createAiSearchRuntime", () => {
  test("does not leak raw query text when the request fails", async () => {
    const failingFetch = (() =>
      Promise.resolve(
        new Response("error", {
          status: 503,
          statusText: "Service Unavailable",
        }),
      )) as unknown as typeof fetch;

    const runtime = createAiSearchRuntime(
      {
        CLOUDFLARE_ACCOUNT_ID: "account-1",
        CLOUDFLARE_API_TOKEN: "token-1",
      } as never,
      {
        fetch: failingFetch,
      },
    );

    const caughtError = await runtime
      .search({
        query: "secret customer data",
      })
      .catch((error: unknown) => error);

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("AI Search request failed with 503 Service Unavailable");
    expect((caughtError as Error).message).not.toContain("secret customer data");
  });
});
