/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { normalizePublicPath } from "./index";

describe("normalizePublicPath", () => {
  test("normalizes relative paths with a leading slash", () => {
    expect(normalizePublicPath("search")).toBe("/search");
  });

  test("trims whitespace around paths", () => {
    expect(normalizePublicPath("  /skills  ")).toBe("/skills");
  });

  test("rejects protocol-relative paths", () => {
    expect(() => normalizePublicPath("//attacker.example")).toThrow(
      "Public page paths must not include a protocol.",
    );
  });
});
