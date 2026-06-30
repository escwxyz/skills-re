/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind asset delivery", () => {
  test("rejects path traversal", async () => {
    const route = (await import("./pagefind-assets").catch(() => ({}))) as {
      createPagefindAssetResponse?: (input: Record<string, unknown>) => Promise<Response>;
    };
    const response = await route.createPagefindAssetResponse?.({
      bucket: { get: async () => null },
      key: "../secret",
      method: "GET",
    });

    expect(response?.status).toBe(400);
  });

  test("serves manifests briefly and generation assets immutably with CORS", async () => {
    const route = await import("./pagefind-assets").catch(() => ({}));
    const createResponse = (
      route as unknown as {
        createPagefindAssetResponse?: (input: Record<string, unknown>) => Promise<Response>;
      }
    ).createPagefindAssetResponse;
    const bucket = {
      get: async () => ({
        arrayBuffer: async () => new TextEncoder().encode("{}").buffer,
        httpEtag: '"etag"',
        httpMetadata: { contentType: "application/json" },
      }),
    };

    const manifest = await createResponse?.({ bucket, key: "current.json", method: "GET" });
    const asset = await createResponse?.({
      bucket,
      key: "generations/123/pagefind/pagefind.js",
      method: "GET",
    });

    expect(manifest?.headers.get("cache-control")).toBe("public, max-age=60");
    expect(asset?.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(asset?.headers.get("access-control-allow-origin")).toBe("*");
  });
});
