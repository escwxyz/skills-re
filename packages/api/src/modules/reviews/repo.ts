import { and, count, desc, eq } from "drizzle-orm";

import { asReviewId } from "@skills-re/db/utils";
import type { ReviewId, SkillId, UserId } from "@skills-re/db/utils";
import { reviewsTable } from "@skills-re/db/schema/reviews";
import { usersTable } from "@skills-re/db/schema/auth";
import { skillsTable } from "@skills-re/db/schema/skills";

import { db } from "../shared/db";

export interface ReviewWithAuthor {
  authorAvatarUrl: string | null;
  authorName: string;
  content: string;
  createdAt: Date;
  id: ReviewId;
  rating: number;
  skillId: SkillId;
  title: string | null;
  updatedAt: Date;
  userId: UserId;
}

const selectWithAuthor = {
  authorAvatarUrl: usersTable.image,
  authorName: usersTable.name,
  content: reviewsTable.content,
  createdAt: reviewsTable.createdAt,
  id: reviewsTable.id,
  rating: reviewsTable.rating,
  skillId: reviewsTable.skillId,
  title: reviewsTable.title,
  updatedAt: reviewsTable.updatedAt,
  userId: reviewsTable.userId,
} as const;

export async function listReviewsBySkillId(
  input: {
    limit?: number;
    skillId: SkillId;
  },
  database = db,
) {
  const limit = input.limit ?? 50;

  return await database
    .select(selectWithAuthor)
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(eq(reviewsTable.skillId, input.skillId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit);
}

export async function getReviewBySkillIdAndUserId(
  input: {
    skillId: SkillId;
    userId: UserId;
  },
  database = db,
) {
  const rows = await database
    .select(selectWithAuthor)
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(and(eq(reviewsTable.skillId, input.skillId), eq(reviewsTable.userId, input.userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listReviewsByUserId(
  input: {
    limit?: number;
    userId: UserId;
  },
  database = db,
) {
  const limit = input.limit ?? 50;

  return await database
    .select({
      ...selectWithAuthor,
      skillSlug: skillsTable.slug,
      skillTitle: skillsTable.title,
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .innerJoin(skillsTable, eq(skillsTable.id, reviewsTable.skillId))
    .where(eq(reviewsTable.userId, input.userId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit);
}

export async function countReviewsByUserId(input: { userId: UserId }, database = db) {
  const [row] = await database
    .select({ count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, input.userId));
  return row?.count ?? 0;
}

export async function createReview(
  input: {
    content: string;
    rating: number;
    skillId: SkillId;
    title: string;
    userId: UserId;
  },
  database = db,
) {
  const now = new Date();
  const rows = await database
    .insert(reviewsTable)
    .values({
      content: input.content,
      createdAt: now,
      rating: input.rating,
      skillId: input.skillId,
      title: input.title,
      updatedAt: now,
      userId: input.userId,
    })
    .returning({
      id: reviewsTable.id,
    });

  const [created] = rows;
  if (!created) {
    throw new Error("Failed to create review.");
  }

  return asReviewId(created.id);
}
