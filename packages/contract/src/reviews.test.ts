/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reviewCreateInputSchema, reviewsContract } from "./reviews";

describe("reviews contract", () => {
  test("accepts structured review title input", () => {
    expect(
      reviewCreateInputSchema.parse({
        content: "Helpful details",
        rating: 5,
        skillId: "skill-1",
        title: "Strong fit",
      }),
    ).toEqual({
      content: "Helpful details",
      rating: 5,
      skillId: "skill-1",
      title: "Strong fit",
    });
  });

  test("exposes the legacy review routes", () => {
    expect(reviewsContract.create).toBeDefined();
    expect(reviewsContract.getMineBySkill).toBeDefined();
    expect(reviewsContract.listBySkill).toBeDefined();
  });
});
