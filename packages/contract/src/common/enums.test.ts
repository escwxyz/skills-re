/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { changelogTypeSchema, healthStatusSchema } from "./enums";

describe("common enums", () => {
  test("parse shared changelog and health status enum payloads", () => {
    expect(changelogTypeSchema.parse("feature")).toBe("feature");
    expect(changelogTypeSchema.parse("patch")).toBe("patch");
    expect(changelogTypeSchema.parse("major")).toBe("major");

    expect(
      healthStatusSchema.parse({
        status: "ok",
        timestamp: 123,
      }),
    ).toEqual({
      status: "ok",
      timestamp: 123,
    });
  });
});
