/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  hasMatchingDirectoryPath,
  normalizeDirectoryPath,
  normalizeRepoDirectoryPath,
} from "./directory-path";

describe("repo directory path helpers", () => {
  test("normalizes directory paths with leading slashes and dot segments", () => {
    expect(normalizeDirectoryPath("/skills/./example")).toBe("skills/example");
    expect(normalizeDirectoryPath("skills/foo/../example")).toBe("skills/example");
  });

  test("returns an empty string for blank directory paths", () => {
    expect(normalizeDirectoryPath("")).toBe("");
    expect(normalizeDirectoryPath("   ")).toBe("");
    expect(normalizeDirectoryPath("/")).toBe("");
  });

  test("appends a trailing slash to normalized repo directory paths", () => {
    expect(normalizeRepoDirectoryPath("skills/example")).toBe("skills/example/");
    expect(normalizeRepoDirectoryPath("skills/example/")).toBe("skills/example/");
  });

  test("matches normalized directory paths against the existing set", () => {
    const existing = new Set(["skills/example/"]);

    expect(hasMatchingDirectoryPath(existing, "skills/example")).toBe(true);
    expect(hasMatchingDirectoryPath(existing, "skills/other")).toBe(false);
  });
});
