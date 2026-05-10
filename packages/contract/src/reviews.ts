import { z } from "zod";

import { baseContract } from "./common/base";
import { paginatedResponseSchema } from "./common/pagination";

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

const reviewStatsSchema = z.object({
  ratingAvg: z.number(),
  ratingCounts: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
  recommendPct: z.number(),
  totalReviews: z.number().int().nonnegative(),
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
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
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
  countMine: baseContract
    .route({
      description: "Returns the authenticated user's total review count.",
      method: "GET",
      path: "/reviews/mine/count",
      tags: ["Reviews"],
      successDescription: "Review count",
      summary: "Count my reviews",
    })
    .output(z.number().int().nonnegative()),
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
      description: "Returns paginated reviews for a skill.",
      method: "GET",
      path: "/reviews/by-skill",
      tags: ["Reviews"],
      successDescription: "Paginated review list",
      summary: "List reviews by skill",
    })
    .input(reviewListInputSchema)
    .output(paginatedResponseSchema(reviewItemSchema)),
  statsBySkill: baseContract
    .route({
      description: "Returns aggregated rating statistics for a skill's reviews.",
      method: "GET",
      path: "/reviews/stats/by-skill",
      tags: ["Reviews"],
      successDescription: "Review statistics",
      summary: "Get review stats by skill",
    })
    .input(z.object({ skillId: z.string().min(1) }))
    .output(reviewStatsSchema),
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
