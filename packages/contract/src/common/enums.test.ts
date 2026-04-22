/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { healthStatusSchema } from "./enums";

describe("common enums", () => {
  test("parse health status enum payload", () => {
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
