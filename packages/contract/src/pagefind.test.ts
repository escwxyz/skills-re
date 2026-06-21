/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind contracts", () => {
  test("validates export pagination and hydration boundaries", async () => {
    const pagefind = (await import("./pagefind").catch(() => ({}))) as {
      pagefindExportInputSchema?: {
        safeParse: (value: unknown) => { success: boolean };
      };
      pagefindHydrationInputSchema?: {
        safeParse: (value: unknown) => { success: boolean };
      };
    };

    expect(pagefind.pagefindExportInputSchema?.safeParse({ cursor: "", limit: 10 }).success).toBe(
      false,
    );
    expect(pagefind.pagefindExportInputSchema?.safeParse({ limit: 101 }).success).toBe(false);
    expect(
      pagefind.pagefindHydrationInputSchema?.safeParse({ skillIds: ["skill-1", "skill-1"] })
        .success,
    ).toBe(false);
    expect(
      pagefind.pagefindHydrationInputSchema?.safeParse({
        skillIds: Array.from({ length: 51 }, (_, index) => `skill-${index}`),
      }).success,
    ).toBe(false);
    expect(pagefind.pagefindHydrationInputSchema?.safeParse({ skillIds: [""] }).success).toBe(
      false,
    );
  });

  test("rejects malformed manifests", async () => {
    const pagefind = (await import("./pagefind").catch(() => ({}))) as {
      pagefindGenerationManifestSchema?: {
        safeParse: (value: unknown) => { success: boolean };
      };
    };

    expect(
      pagefind.pagefindGenerationManifestSchema?.safeParse({
        bundleUrl: "javascript:alert(1)",
        generationId: "../latest",
        pagefindVersion: "1.5.2",
        publishedAt: -1,
        recordCount: -1,
        schemaVersion: 1,
        sourceWatermark: -1,
      }).success,
    ).toBe(false);
  });
});
