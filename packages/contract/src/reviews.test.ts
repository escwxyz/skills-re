/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reviewsContract } from "./reviews";

describe("reviews contract", () => {
  test("exposes the legacy review routes", () => {
    expect(reviewsContract.create).toBeDefined();
    expect(reviewsContract.getMineBySkill).toBeDefined();
    expect(reviewsContract.listBySkill).toBeDefined();
  });
});
