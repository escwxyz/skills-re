/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { decodeTagCursor, encodeTagCursor } from "./cursor";

describe("tags cursor", () => {
  test("encodes and decodes tag cursors", () => {
    const encoded = encodeTagCursor({ count: 12, slug: "automation" });

    expect(decodeTagCursor(encoded)).toEqual({
      count: 12,
      slug: "automation",
    });
    expect(decodeTagCursor("not-a-cursor")).toBeNull();
  });
});
