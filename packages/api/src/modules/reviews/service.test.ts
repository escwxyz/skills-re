/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asReviewId, asSkillId, asUserId } from "@skills-re/db/utils";

import { createReviewsService } from "./service";

describe("reviews service", () => {
  test("creates a review for the authenticated user", async () => {
    const calls: unknown[] = [];
    let callCount = 0;
    const service = createReviewsService({
      createReview: async (input) => {
        calls.push(input);
        return asReviewId("review-1");
      },
      getReviewBySkillIdAndUserId: async () => {
        callCount += 1;
        if (callCount === 1) {
          return null;
        }

        return {
          authorAvatarUrl: null,
          authorName: "Ada",
          content: "Helpful",
          createdAt: new Date(123),
          id: asReviewId("review-1"),
          rating: 5,
          skillId: asSkillId("skill-1"),
          updatedAt: new Date(123),
          userId: asUserId("user-1"),
        };
      },
    });

    await expect(
      service.create({
        content: "  Helpful  ",
        rating: 5,
        skillId: "skill-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      author: {
        avatarUrl: null,
        name: "Ada",
      },
      content: "Helpful",
      createdAt: 123,
      id: "review-1",
      rating: 5,
      skillId: "skill-1",
      updatedAt: 123,
      userId: "user-1",
    });
    expect(calls).toEqual([
      {
        content: "Helpful",
        rating: 5,
        skillId: "skill-1",
        userId: "user-1",
      },
    ]);
  });

  test("rejects duplicate reviews from the same user", async () => {
    const service = createReviewsService({
      createReview: async () => asReviewId("review-1"),
      getReviewBySkillIdAndUserId: async () => ({
        authorAvatarUrl: null,
        authorName: "Ada",
        content: "Helpful",
        createdAt: new Date(123),
        id: asReviewId("review-1"),
        rating: 5,
        skillId: asSkillId("skill-1"),
        updatedAt: new Date(123),
        userId: asUserId("user-1"),
      }),
    });

    await expect(
      service.create({
        content: "Helpful",
        rating: 5,
        skillId: "skill-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("You have already reviewed this skill.");
  });

  test("lists reviews for a skill", async () => {
    const service = createReviewsService({
      listReviewsBySkillId: async () => [
        {
          authorAvatarUrl: null,
          authorName: "Ada",
          content: "Helpful",
          createdAt: new Date(123),
          id: asReviewId("review-1"),
          rating: 5,
          skillId: asSkillId("skill-1"),
          updatedAt: new Date(123),
          userId: asUserId("user-1"),
        },
      ],
    });

    await expect(service.listBySkill({ skillId: "skill-1", limit: 20 })).resolves.toEqual([
      {
        author: {
          avatarUrl: null,
          name: "Ada",
        },
        content: "Helpful",
        createdAt: 123,
        id: "review-1",
        rating: 5,
        skillId: "skill-1",
        updatedAt: 123,
        userId: "user-1",
      },
    ]);
  });

  test("returns null when the user has not reviewed the skill", async () => {
    const service = createReviewsService({
      getReviewBySkillIdAndUserId: async () => null,
    });

    await expect(
      service.getMineBySkill({ skillId: "skill-1", userId: "user-1" }),
    ).resolves.toBeNull();
  });
});
