import { describe, expect, test } from "bun:test";

import {
  formatRelativeTime,
  getTimeDifference,
  shouldUseRelativeTimeHook,
} from "./use-relative-time";

describe("formatRelativeTime", () => {
  test("formats elapsed time without needing React hooks", () => {
    const now = Date.UTC(2026, 4, 13, 12, 0, 0);
    const timestamp = now - 2 * 60 * 1000;

    expect(formatRelativeTime(timestamp, "en", now)).toBe("2 minutes ago");
  });
});

describe("time helpers", () => {
  test("returns the time difference as now minus timestamp", () => {
    const now = 1_000;
    const timestamp = 250;

    expect(getTimeDifference(timestamp, now)).toBe(750);
  });

  test("uses the hook for sub-hour differences only", () => {
    const now = 1_000;

    expect(shouldUseRelativeTimeHook(now - 59 * 60 * 1000, now)).toBe(true);
    expect(shouldUseRelativeTimeHook(now - 61 * 60 * 1000, now)).toBe(false);
  });
});
