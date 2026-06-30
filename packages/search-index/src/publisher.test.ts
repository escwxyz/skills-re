/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind generation publisher", () => {
  test("activates current.json only after assets and remote validation", async () => {
    const publisher = (await import("./publisher").catch(() => ({}))) as {
      publishGeneration?: (input: Record<string, unknown>) => Promise<unknown>;
    };
    const writes: string[] = [];
    const store = {
      head: async () => true,
      put: async (key: string) => {
        writes.push(key);
      },
    };

    await publisher.publishGeneration?.({
      files: [
        { bytes: new Uint8Array([1]), contentType: "text/javascript", path: "pagefind.js" },
        { bytes: new Uint8Array([2]), contentType: "application/octet-stream", path: "index/a" },
      ],
      manifest: {
        bundleUrl: "https://api.example.com/pagefind/generations/123-a/pagefind/",
        generationId: "123-a",
        pagefindVersion: "1.5.2",
        publishedAt: 1,
        recordCount: 1,
        schemaVersion: 1,
        sourceWatermark: 123,
      },
      smokeTest: async () => undefined,
      store,
    });

    expect(writes.at(-1)).toBe("pagefind/current.json");
    expect(writes.slice(0, -1)).toEqual([
      "pagefind/generations/123-a/pagefind/pagefind.js",
      "pagefind/generations/123-a/pagefind/index/a",
      "pagefind/generations/123-a/generation.json",
    ]);
  });

  test("bounds concurrent remote object validation", async () => {
    const { publishGeneration } = await import("./publisher");
    let activeChecks = 0;
    let maxActiveChecks = 0;

    await publishGeneration({
      files: Array.from({ length: 20 }, (_, index) => ({
        bytes: new Uint8Array([index]),
        contentType: "application/octet-stream",
        path: `index/${index}.pf_index`,
      })),
      manifest: {
        bundleUrl: "https://api.example.com/pagefind/generations/123-a/pagefind/",
        generationId: "123-a",
        pagefindVersion: "1.5.2",
        publishedAt: 1,
        recordCount: 20,
        schemaVersion: 1,
        sourceWatermark: 123,
      },
      smokeTest: async () => undefined,
      store: {
        delete: async () => undefined,
        head: async () => {
          activeChecks += 1;
          maxActiveChecks = Math.max(maxActiveChecks, activeChecks);
          await Bun.sleep(2);
          activeChecks -= 1;
          return true;
        },
        put: async () => undefined,
      },
    });

    expect(maxActiveChecks).toBeLessThanOrEqual(8);
  });

  test("does not activate a generation when asset upload fails", async () => {
    const publisher = (await import("./publisher").catch(() => ({}))) as {
      publishGeneration?: (input: Record<string, unknown>) => Promise<unknown>;
    };
    const writes: string[] = [];
    const store = {
      head: async () => true,
      put: async (key: string) => {
        writes.push(key);
        if (writes.length === 2) {
          throw new Error("upload failed");
        }
      },
    };

    await expect(
      publisher.publishGeneration?.({
        files: [
          { bytes: new Uint8Array([1]), contentType: "text/javascript", path: "pagefind.js" },
          { bytes: new Uint8Array([2]), contentType: "application/octet-stream", path: "index/a" },
        ],
        manifest: {
          bundleUrl: "https://api.example.com/pagefind/generations/123-a/pagefind/",
          generationId: "123-a",
          pagefindVersion: "1.5.2",
          publishedAt: 1,
          recordCount: 1,
          schemaVersion: 1,
          sourceWatermark: 123,
        },
        smokeTest: async () => undefined,
        store,
      }),
    ).rejects.toThrow("upload failed");
    expect(writes).not.toContain("pagefind/current.json");
  });

  test("cleans uploaded generation objects when validation fails", async () => {
    const { publishGeneration } = await import("./publisher");
    const uploadedKeys = [
      "pagefind/generations/123-a/pagefind/pagefind.js",
      "pagefind/generations/123-a/generation.json",
    ];

    for (const failureStage of ["remote", "smoke"] as const) {
      const deleted: string[] = [];
      await expect(
        publishGeneration({
          files: [
            { bytes: new Uint8Array([1]), contentType: "text/javascript", path: "pagefind.js" },
          ],
          manifest: {
            bundleUrl: "https://api.example.com/pagefind/generations/123-a/pagefind/",
            generationId: "123-a",
            pagefindVersion: "1.5.2",
            publishedAt: 1,
            recordCount: 1,
            schemaVersion: 1,
            sourceWatermark: 123,
          },
          smokeTest: async () => {
            if (failureStage === "smoke") {
              throw new Error("smoke failed");
            }
          },
          store: {
            delete: async (key) => {
              deleted.push(key);
            },
            head: async () => failureStage !== "remote",
            put: async () => undefined,
          },
        }),
      ).rejects.toThrow(failureStage === "remote" ? "Remote Pagefind validation" : "smoke failed");
      expect(deleted.toSorted()).toEqual(uploadedKeys.toSorted());
    }
  });

  test("retains active, previous, and recent generations", async () => {
    const publisher = (await import("./publisher").catch(() => ({}))) as {
      selectExpiredGenerationIds?: (
        generations: { generationId: string; publishedAt: number }[],
        input: { activeGenerationId: string; now: number; previousGenerationId: string },
      ) => string[];
    };
    const day = 86_400_000;
    const expired = publisher.selectExpiredGenerationIds?.(
      [
        { generationId: "active", publishedAt: 0 },
        { generationId: "previous", publishedAt: 0 },
        { generationId: "recent", publishedAt: 9 * day },
        { generationId: "old", publishedAt: day },
      ],
      { activeGenerationId: "active", now: 10 * day, previousGenerationId: "previous" },
    );

    expect(expired).toEqual(["old"]);
  });

  test("deletes only files belonging to expired generation descriptors", async () => {
    const { cleanupExpiredGenerations } = await import("./publisher");
    const deleted: string[] = [];

    await cleanupExpiredGenerations({
      deleteKey: async (key) => {
        deleted.push(key);
      },
      descriptors: [
        {
          bundleUrl: "https://api.example.com/pagefind/generations/old/pagefind/",
          files: ["pagefind.js", "index/a.pf_index"],
          generationId: "old",
          pagefindVersion: "1.5.2",
          publishedAt: 1,
          recordCount: 1,
          schemaVersion: 1,
          sourceWatermark: 1,
        },
      ],
      expiredGenerationIds: ["old"],
    });

    expect(deleted).toEqual([
      "pagefind/generations/old/pagefind/pagefind.js",
      "pagefind/generations/old/pagefind/index/a.pf_index",
      "pagefind/generations/old/generation.json",
    ]);
  });

  test("creates a rollback manifest for the retained immutable generation", async () => {
    const { createRollbackManifest } = await import("./publisher");
    const rollback = createRollbackManifest(
      {
        bundleUrl: "https://api.example.com/pagefind/generations/known-good/pagefind/",
        generationId: "known-good",
        pagefindVersion: "1.5.2",
        publishedAt: 1,
        recordCount: 10,
        schemaVersion: 1,
        sourceWatermark: 100,
      },
      200,
    );

    expect(rollback).toMatchObject({
      bundleUrl: "https://api.example.com/pagefind/generations/known-good/pagefind/",
      generationId: "known-good",
      publishedAt: 200,
    });
  });
});
