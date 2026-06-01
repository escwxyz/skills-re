/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getIncomingHeaders } from "./orpc-incoming-headers";

describe("getIncomingHeaders", () => {
  test("returns empty headers outside request context", () => {
    const headers = getIncomingHeaders(() => {
      throw new Error(
        "No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.",
      );
    });

    expect(Array.from(headers.entries())).toHaveLength(0);
  });

  test("rethrows non-context errors", () => {
    expect(() =>
      getIncomingHeaders(() => {
        throw new Error("unexpected failure");
      }),
    ).toThrow("unexpected failure");
  });
});
