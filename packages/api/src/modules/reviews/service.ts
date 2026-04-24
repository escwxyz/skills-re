import { asSkillId, asUserId } from "@skills-re/db/utils";
import { createDepGetter } from "../shared/deps";

import type {
  ReviewWithAuthor,
  createReview,
  getReviewBySkillIdAndUserId,
  listReviewsBySkillId,
} from "./repo";

const toOutputItem = (row: ReviewWithAuthor) => ({
  author: {
    avatarUrl: row.authorAvatarUrl,
    name: row.authorName,
  },
  content: row.content,
  createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  id: String(row.id),
  rating: row.rating,
  skillId: String(row.skillId),
  updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
  userId: String(row.userId),
});

interface ReviewsServiceDeps {
  createReview: typeof createReview;
  getReviewBySkillIdAndUserId: typeof getReviewBySkillIdAndUserId;
  listReviewsBySkillId: typeof listReviewsBySkillId;
}

const createDefaultReviewsDeps = async (): Promise<ReviewsServiceDeps> => {
  const repo = await import("./repo");
  return {
    createReview: repo.createReview,
    getReviewBySkillIdAndUserId: repo.getReviewBySkillIdAndUserId,
    listReviewsBySkillId: repo.listReviewsBySkillId,
  };
};

export const createReviewsService = (overrides: Partial<ReviewsServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<ReviewsServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultReviewsDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  return {
    async create(input: { skillId: string; userId: string; rating: number; content: string }) {
      const createReviewFn = await getDep("createReview");
      const getReviewBySkillIdAndUserIdFn = await getDep("getReviewBySkillIdAndUserId");

      const skillId = asSkillId(input.skillId);
      const userId = asUserId(input.userId);

      const existing = await getReviewBySkillIdAndUserIdFn({
        skillId,
        userId,
      });
      if (existing) {
        throw new Error("You have already reviewed this skill.");
      }

      await createReviewFn({
        content: input.content.trim(),
        rating: input.rating,
        skillId,
        userId,
      });

      const created = await getReviewBySkillIdAndUserIdFn({
        skillId,
        userId,
      });
      if (!created) {
        throw new Error("Failed to load created review.");
      }

      return toOutputItem(created);
    },

    async getMineBySkill(input: { skillId: string; userId: string }) {
      const getReviewBySkillIdAndUserIdFn = await getDep("getReviewBySkillIdAndUserId");
      const row = await getReviewBySkillIdAndUserIdFn({
        skillId: asSkillId(input.skillId),
        userId: asUserId(input.userId),
      });

      return row ? toOutputItem(row) : null;
    },

    async listBySkill(input: { skillId: string; limit?: number }) {
      const listReviewsBySkillIdFn = await getDep("listReviewsBySkillId");
      const rows = await listReviewsBySkillIdFn({
        limit: input.limit,
        skillId: asSkillId(input.skillId),
      });

      return rows.map((row) => toOutputItem(row));
    },
  };
};

export const reviewsService = createReviewsService();

export async function createReviewRecord(input: {
  skillId: string;
  userId: string;
  rating: number;
  content: string;
}) {
  return await reviewsService.create(input);
}

export async function getMyReviewBySkill(input: { skillId: string; userId: string }) {
  return await reviewsService.getMineBySkill(input);
}

export async function listReviewsBySkill(input: { skillId: string; limit?: number }) {
  return await reviewsService.listBySkill(input);
}
