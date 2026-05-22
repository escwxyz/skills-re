/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { parsePositiveInteger } from "./utils";

describe("parsePositiveInteger", () => {
  test("returns fallback for malformed integer strings", () => {
    expect(parsePositiveInteger("12abc", 5)).toBe(5);
    expect(parsePositiveInteger("1.5", 5)).toBe(5);
    expect(parsePositiveInteger("1 2", 5)).toBe(5);
  });

  test("accepts fully valid integer strings", () => {
    expect(parsePositiveInteger(" 12 ", 5)).toBe(12);
    expect(parsePositiveInteger("+12", 5)).toBe(12);
    expect(parsePositiveInteger("-12", 5)).toBe(1);
  });
});
