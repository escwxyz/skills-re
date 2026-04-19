import { and, desc, eq } from "drizzle-orm";

import { feedbackTable } from "@skills-re/db/schema/feedback";
import { asFeedbackId, asUserId } from "@skills-re/db/utils";
import type { FeedbackId, UserId } from "@skills-re/db/utils";

type FeedbackDb = typeof import("../shared/db").db;

export type FeedbackStatus = "pending" | "resolved" | "in_review";
export type FeedbackType = "bug" | "request" | "general";

export interface FeedbackRow {
  content: string;
  createdAt: number;
  id: string;
  response: string | null;
  status: FeedbackStatus;
  title: string;
  type: FeedbackType;
  updatedAt: number;
  userId: string | null;
}

const getDb = async (database?: FeedbackDb) =>
  database ?? (await import("../shared/db")).db;

export async function createFeedback(
  input: {
    content: string;
    title: string;
    type: FeedbackType;
    userId?: UserId | null;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  const now = Date.now();
  const rows = await db
    .insert(feedbackTable)
    .values({
      content: input.content,
      createdAt: now,
      response: null,
      status: "pending",
      title: input.title,
      type: input.type,
      updatedAt: now,
      userId: input.userId ?? null,
    })
    .returning({
      id: feedbackTable.id,
    });

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create feedback");
  }

  return created.id;
}

export async function listFeedback(
  input?: {
    status?: FeedbackStatus;
    limit?: number;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  const limit = input?.limit ?? 100;
  const baseQuery = db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt)).limit(limit);

  if (input?.status) {
    return await baseQuery.where(eq(feedbackTable.status, input.status));
  }

  return await baseQuery;
}

export async function listFeedbackByUser(
  input: {
    userId: UserId;
    limit?: number;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  const limit = input.limit ?? 100;

  return await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.userId, input.userId))
    .orderBy(desc(feedbackTable.createdAt))
    .limit(limit);
}

export async function getFeedbackById(id: FeedbackId, database?: FeedbackDb) {
  const db = await getDb(database);
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.id, asFeedbackId(id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFeedbackByIdAndUser(
  input: {
    id: FeedbackId;
    userId: UserId;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  const rows = await db
    .select()
    .from(feedbackTable)
    .where(and(eq(feedbackTable.id, input.id), eq(feedbackTable.userId, asUserId(input.userId))))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateFeedbackStatus(
  input: {
    id: FeedbackId;
    status: FeedbackStatus;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  await db
    .update(feedbackTable)
    .set({
      status: input.status,
      updatedAt: Date.now(),
    })
    .where(eq(feedbackTable.id, input.id));
}

export async function updateFeedbackResponse(
  input: {
    id: FeedbackId;
    response?: string | null;
  },
  database?: FeedbackDb,
) {
  const db = await getDb(database);
  await db
    .update(feedbackTable)
    .set({
      response: input.response ?? null,
      updatedAt: Date.now(),
    })
    .where(eq(feedbackTable.id, input.id));
}
