/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { isRateLimitedError } from "./is-rate-limited-error";

describe("isRateLimitedError", () => {
  test("matches common rate limit error shapes", () => {
    expect(isRateLimitedError(new Error("Too Many Requests"))).toBe(true);
    expect(isRateLimitedError(new Error("RATE_LIMITED"))).toBe(true);
    expect(isRateLimitedError({ message: "429" })).toBe(true);
  });

  test("ignores unrelated errors", () => {
    expect(isRateLimitedError(new Error("Validation failed"))).toBe(false);
    expect(isRateLimitedError({ message: "Bad Request" })).toBe(false);
    expect(isRateLimitedError(undefined)).toBe(false);
  });
});
