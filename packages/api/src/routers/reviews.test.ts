/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";

import type { Context } from "../types";
import { createReviewProcedure } from "./index";

const reviewInput = {
  content: "Explains the migration clearly.",
  rating: 5,
  skillId: "skill-1",
  title: "Excellent migration guide",
};

const context = (overrides: Partial<Context> = {}): Context => ({
  auth: null,
  session: null,
  ...overrides,
});

const procedure = createReviewProcedure(async (input) => ({
  author: {
    avatarUrl: null,
    name: "Ada",
  },
  content: input.content,
  createdAt: 123,
  id: "review-1",
  rating: input.rating,
  skillId: input.skillId,
  title: input.title,
  updatedAt: 123,
  userId: input.userId,
}));

describe("reviews.create authentication", () => {
  test("creates a review for the verified API-key owner", async () => {
    const result = await call(procedure, reviewInput, {
      context: context({ apiKey: { userId: "api-user-1" } }),
    });

    expect(result).toEqual({
      author: {
        avatarUrl: null,
        name: "Ada",
      },
      content: "Explains the migration clearly.",
      createdAt: 123,
      id: "review-1",
      rating: 5,
      skillId: "skill-1",
      title: "Excellent migration guide",
      updatedAt: 123,
      userId: "api-user-1",
    });
  });

  test("continues to create a review for a browser session", async () => {
    const result = await call(procedure, reviewInput, {
      context: context({
        session: {
          session: {
            expiresAt: new Date(Date.now() + 3_600_000),
            id: "session-1",
            userId: "session-user-1",
          },
          user: {
            id: "session-user-1",
          },
        },
      }),
    });

    expect(result.userId).toBe("session-user-1");
  });

  test("rejects review creation without a session or API key", async () => {
    const error = await call(procedure, reviewInput, {
      context: context(),
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ORPCError);
    expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
  });
});
