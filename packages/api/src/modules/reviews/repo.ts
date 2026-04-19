import { and, desc, eq } from "drizzle-orm";

import { asReviewId } from "@skills-re/db/utils";
import type { ReviewId, SkillId, UserId } from "@skills-re/db/utils";
import { reviewsTable } from "@skills-re/db/schema/reviews";

import { usersTable } from "@skills-re/db/schema/auth";

type ReviewsDb = typeof import("../shared/db").db;

export interface ReviewWithAuthor {
  authorAvatarUrl: string | null;
  authorName: string;
  content: string;
  createdAt: Date;
  id: ReviewId;
  rating: number;
  skillId: SkillId;
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
  updatedAt: reviewsTable.updatedAt,
  userId: reviewsTable.userId,
} as const;

const getDb = async (database?: ReviewsDb) => database ?? (await import("../shared/db")).db;

export async function listReviewsBySkillId(
  input: {
    limit?: number;
    skillId: SkillId;
  },
  database?: ReviewsDb,
) {
  const db = await getDb(database);
  const limit = input.limit ?? 50;

  return await db
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
  database?: ReviewsDb,
) {
  const db = await getDb(database);
  const rows = await db
    .select(selectWithAuthor)
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(and(eq(reviewsTable.skillId, input.skillId), eq(reviewsTable.userId, input.userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function createReview(
  input: {
    content: string;
    rating: number;
    skillId: SkillId;
    userId: UserId;
  },
  database?: ReviewsDb,
) {
  const db = await getDb(database);
  const now = new Date();
  const rows = await db
    .insert(reviewsTable)
    .values({
      content: input.content,
      createdAt: now,
      rating: input.rating,
      skillId: input.skillId,
      updatedAt: now,
      userId: input.userId,
    })
    .returning({
      id: reviewsTable.id,
    });

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create review.");
  }

  return asReviewId(created.id);
}
