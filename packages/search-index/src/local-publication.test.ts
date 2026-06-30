/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("local Pagefind publication", () => {
  test("bounds remote smoke checks with an abort signal", async () => {
    const module = await import("./local-publication");
    const fetchPagefindSmokeAsset = (
      module as unknown as {
        fetchPagefindSmokeAsset?: (url: URL, fetchImpl: typeof fetch) => Promise<void>;
      }
    ).fetchPagefindSmokeAsset;
    let signal: AbortSignal | null | undefined;

    expect(fetchPagefindSmokeAsset).toBeDefined();
    if (!fetchPagefindSmokeAsset) {
      return;
    }

    await fetchPagefindSmokeAsset(new URL("https://search.example.com/pagefind.js"), (async (
      _input,
      init,
    ) => {
      signal = init?.signal;
      return new Response(null, { status: 200 });
    }) as typeof fetch);

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
  });

  test("distinguishes missing JSON objects from storage and parsing failures", async () => {
    const module = await import("./local-publication");
    const readJson = (
      module as unknown as {
        readJsonObject?: <T>(
          store: { get: (key: string) => Promise<Uint8Array | null> },
          key: string,
        ) => Promise<T | null>;
      }
    ).readJsonObject;

    expect(readJson).toBeDefined();
    if (!readJson) {
      return;
    }

    await expect(readJson({ get: async () => null }, "missing.json")).resolves.toBeNull();
    await expect(
      readJson(
        {
          get: async () => {
            throw new Error("authentication failed");
          },
        },
        "private.json",
      ),
    ).rejects.toThrow("authentication failed");
    await expect(
      readJson({ get: async () => new TextEncoder().encode("not-json") }, "corrupt.json"),
    ).rejects.toThrow("Invalid JSON object: corrupt.json");
  });
});
