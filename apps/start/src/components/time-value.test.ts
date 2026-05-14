import { describe, expect, test } from "bun:test";

import { resolveTimeValueTimestamp } from "./time-value";

describe("resolveTimeValueTimestamp", () => {
  test("accepts numbers, dates, and ISO strings", () => {
    const timestamp = Date.UTC(2026, 4, 13, 12, 0, 0);

    expect(resolveTimeValueTimestamp(timestamp)).toBe(timestamp);
    expect(resolveTimeValueTimestamp(new Date(timestamp))).toBe(timestamp);
    expect(resolveTimeValueTimestamp("2026-05-13T12:00:00.000Z")).toBe(timestamp);
  });
});
