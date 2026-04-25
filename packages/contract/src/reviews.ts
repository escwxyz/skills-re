import { z } from "zod";

import { baseContract } from "./common/base";

const reviewAuthorSchema = z.object({
  avatarUrl: z.string().nullable(),
  name: z.string(),
});

const reviewItemSchema = z.object({
  author: reviewAuthorSchema,
  content: z.string(),
  createdAt: z.number().int().nonnegative(),
  id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  skillId: z.string().min(1),
  title: z.string().min(1).optional(),
  updatedAt: z.number().int().nonnegative(),
  userId: z.string().min(1),
});

const reviewIdInputSchema = z.object({
  skillId: z.string().min(1),
});

export const reviewCreateInputSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5),
  skillId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
});

const reviewListInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  skillId: z.string().min(1),
});

const reviewListMineInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

const reviewListMineItemSchema = reviewItemSchema.extend({
  skillSlug: z.string().min(1),
  skillTitle: z.string().min(1),
});

export const reviewsContract = {
  create: baseContract
    .route({
      description: "Creates a review for the authenticated user.",
      method: "POST",
      path: "/reviews",
      tags: ["Reviews"],
      successDescription: "Review created",
      summary: "Create review",
    })
    .input(reviewCreateInputSchema)
    .output(reviewItemSchema),
  getMineBySkill: baseContract
    .route({
      description: "Returns the authenticated user's review for a skill.",
      method: "GET",
      path: "/reviews/mine/by-skill",
      tags: ["Reviews"],
      successDescription: "Owned review",
      summary: "Read my review by skill",
    })
    .input(reviewIdInputSchema)
    .output(reviewItemSchema.nullable()),
  listBySkill: baseContract
    .route({
      description: "Returns reviews for a skill.",
      method: "GET",
      path: "/reviews/by-skill",
      tags: ["Reviews"],
      successDescription: "Review list",
      summary: "List reviews by skill",
    })
    .input(reviewListInputSchema)
    .output(z.array(reviewItemSchema)),
  listMine: baseContract
    .route({
      description: "Returns the authenticated user's reviews across all skills.",
      method: "GET",
      path: "/reviews/mine",
      tags: ["Reviews"],
      successDescription: "Review list",
      summary: "List my reviews",
    })
    .input(reviewListMineInputSchema)
    .output(z.array(reviewListMineItemSchema)),
} as const;
