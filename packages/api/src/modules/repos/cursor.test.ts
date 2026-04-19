/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { decodeRepoCursor, encodeRepoCursor } from "./cursor";

describe("repo cursor helpers", () => {
  test("encodes an empty cursor as an empty string", () => {
    expect(encodeRepoCursor(null)).toBe("");
  });

  test("round-trips a repo cursor payload", () => {
    const cursor = {
      id: "repo_123",
      syncTime: 1_717_011_200_000,
    };

    expect(decodeRepoCursor(encodeRepoCursor(cursor))).toEqual(cursor);
  });

  test("returns null for an invalid repo cursor", () => {
    expect(decodeRepoCursor("not-a-cursor")).toBeNull();
  });
});
