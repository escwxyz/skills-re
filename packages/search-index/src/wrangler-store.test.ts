/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Wrangler R2 store", () => {
  test("classifies only explicit missing-object failures as absent keys", async () => {
    const module = await import("./wrangler-store");
    const isMissingR2ObjectError = (
      module as unknown as { isMissingR2ObjectError?: (error: unknown) => boolean }
    ).isMissingR2ObjectError;

    expect(isMissingR2ObjectError).toBeDefined();
    if (!isMissingR2ObjectError) {
      return;
    }

    expect(isMissingR2ObjectError(new Error("The specified key does not exist."))).toBe(true);
    expect(isMissingR2ObjectError(new Error("authentication failed"))).toBe(false);
    expect(isMissingR2ObjectError(new Error("network unavailable"))).toBe(false);
  });
});
