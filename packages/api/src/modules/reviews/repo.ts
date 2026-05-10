import { and, avg, count, desc, eq, lt, or, sql } from "drizzle-orm";

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

interface ReviewCursor {
  createdAt: number;
  id: string;
}

const encodeReviewCursor = (cursor: ReviewCursor | null): string => {
  if (!cursor) {
    return "";
  }
  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const decodeReviewCursor = (cursor: string | undefined): ReviewCursor | null => {
  if (!cursor) {
    return null;
  }
  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as { createdAt?: unknown; id?: unknown };
    if (typeof parsed.createdAt === "number" && typeof parsed.id === "string") {
      return { createdAt: parsed.createdAt, id: parsed.id };
    }
  } catch {
    return null;
  }
  return null;
};

export async function listReviewsBySkillId(
  input: {
    cursor?: string;
    limit?: number;
    skillId: SkillId;
  },
  database = db,
) {
  const limit = input.limit ?? 10;
  const cursor = decodeReviewCursor(input.cursor);

  const rows = await database
    .select(selectWithAuthor)
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(
      cursor
        ? and(
            eq(reviewsTable.skillId, input.skillId),
            or(
              lt(reviewsTable.createdAt, new Date(cursor.createdAt)),
              and(
                eq(reviewsTable.createdAt, new Date(cursor.createdAt)),
                lt(reviewsTable.id, asReviewId(cursor.id)),
              ),
            ),
          )
        : eq(reviewsTable.skillId, input.skillId),
    )
    .orderBy(desc(reviewsTable.createdAt), desc(reviewsTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;

  return {
    continueCursor: encodeReviewCursor(
      rows.length > limit && next
        ? { createdAt: next.createdAt.getTime(), id: String(next.id) }
        : null,
    ),
    isDone: rows.length <= limit,
    page,
  };
}

export async function getReviewStatsBySkillId(input: { skillId: SkillId }, database = db) {
  const [row] = await database
    .select({
      avgRating: avg(reviewsTable.rating),
      count1: sql<number>`sum(case when ${reviewsTable.rating} = 1 then 1 else 0 end)`,
      count2: sql<number>`sum(case when ${reviewsTable.rating} = 2 then 1 else 0 end)`,
      count3: sql<number>`sum(case when ${reviewsTable.rating} = 3 then 1 else 0 end)`,
      count4: sql<number>`sum(case when ${reviewsTable.rating} = 4 then 1 else 0 end)`,
      count5: sql<number>`sum(case when ${reviewsTable.rating} = 5 then 1 else 0 end)`,
      recommendCount: sql<number>`sum(case when ${reviewsTable.rating} >= 4 then 1 else 0 end)`,
      total: count(),
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.skillId, input.skillId));

  const total = row?.total ?? 0;
  const avgRating = row?.avgRating ? Number(row.avgRating) : 0;
  const recommendCount = Number(row?.recommendCount ?? 0);

  return {
    ratingAvg: total > 0 ? Math.round(avgRating * 10) / 10 : 0,
    ratingCounts: {
      1: Number(row?.count1 ?? 0),
      2: Number(row?.count2 ?? 0),
      3: Number(row?.count3 ?? 0),
      4: Number(row?.count4 ?? 0),
      5: Number(row?.count5 ?? 0),
    },
    recommendPct: total > 0 ? Math.round((recommendCount / total) * 100) : 0,
    totalReviews: total,
  };
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
