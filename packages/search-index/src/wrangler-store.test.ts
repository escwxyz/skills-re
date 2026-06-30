/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";

import { runWrangler } from "./wrangler-store";

describe("Wrangler R2 store", () => {
  test("kills a hung Wrangler subprocess before timing out", async () => {
    const child = new EventEmitter() as EventEmitter & {
      kill: () => boolean;
      stderr: null;
      stdout: null;
    };
    let killed = false;
    child.stderr = null;
    child.stdout = null;
    child.kill = () => {
      killed = true;
      return true;
    };

    await expect(
      runWrangler([], "ignore", {
        spawnImpl: () => child,
        timeoutMs: 5,
      }),
    ).rejects.toThrow("Wrangler timed out after 5ms");
    expect(killed).toBe(true);
  });

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
