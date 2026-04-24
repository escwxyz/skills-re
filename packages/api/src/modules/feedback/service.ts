import { asFeedbackId, asUserId } from "@skills-re/db/utils";
import { createDepGetter } from "../shared/deps";

import type {
  createFeedback,
  FeedbackRow,
  FeedbackStatus,
  FeedbackType,
  getFeedbackById,
  getFeedbackByIdAndUser,
  listFeedback,
  listFeedbackByUser,
  updateFeedbackResponse,
  updateFeedbackStatus,
} from "./repo";

const toOutputItem = (row: FeedbackRow) => ({
  _creationTime: row.createdAt,
  _id: row.id,
  content: row.content,
  response: row.response,
  status: row.status,
  title: row.title,
  type: row.type,
  userId: row.userId ?? "",
});

interface FeedbackServiceDeps {
  createFeedback: typeof createFeedback;
  getFeedbackById: typeof getFeedbackById;
  getFeedbackByIdAndUser: typeof getFeedbackByIdAndUser;
  listFeedback: typeof listFeedback;
  listFeedbackByUser: typeof listFeedbackByUser;
  updateFeedbackResponse: typeof updateFeedbackResponse;
  updateFeedbackStatus: typeof updateFeedbackStatus;
}

const createDefaultFeedbackDeps = async (): Promise<FeedbackServiceDeps> => {
  const repo = await import("./repo");
  return {
    createFeedback: repo.createFeedback,
    getFeedbackById: repo.getFeedbackById,
    getFeedbackByIdAndUser: repo.getFeedbackByIdAndUser,
    listFeedback: repo.listFeedback,
    listFeedbackByUser: repo.listFeedbackByUser,
    updateFeedbackResponse: repo.updateFeedbackResponse,
    updateFeedbackStatus: repo.updateFeedbackStatus,
  };
};

export const createFeedbackService = (overrides: Partial<FeedbackServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<FeedbackServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultFeedbackDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  return {
    async create(input: {
      title: string;
      content: string;
      type?: FeedbackType;
      userId?: string | null;
    }) {
      const createFeedbackFn = await getDep("createFeedback");
      const id = await createFeedbackFn({
        content: input.content,
        title: input.title,
        type: input.type ?? "general",
        userId: input.userId ? asUserId(input.userId) : null,
      });
      return { id };
    },

    async getById(id: string) {
      const getFeedbackByIdFn = await getDep("getFeedbackById");
      const row = await getFeedbackByIdFn(asFeedbackId(id));
      return row ? toOutputItem(row) : null;
    },

    async getMineById(input: { id: string; userId: string }) {
      const getFeedbackByIdAndUserFn = await getDep("getFeedbackByIdAndUser");
      const row = await getFeedbackByIdAndUserFn({
        id: asFeedbackId(input.id),
        userId: asUserId(input.userId),
      });
      return row ? toOutputItem(row) : null;
    },

    async list(input?: { status?: FeedbackStatus; limit?: number }) {
      const listFeedbackFn = await getDep("listFeedback");
      const rows = await listFeedbackFn(input);
      return rows.map((row) => toOutputItem(row));
    },

    async listMine(input: { userId: string; limit?: number }) {
      const listFeedbackByUserFn = await getDep("listFeedbackByUser");
      const rows = await listFeedbackByUserFn({
        limit: input.limit,
        userId: asUserId(input.userId),
      });
      return rows.map((row) => toOutputItem(row));
    },

    async updateResponse(input: { id: string; response?: string | null }) {
      const updateFeedbackResponseFn = await getDep("updateFeedbackResponse");
      await updateFeedbackResponseFn({
        id: asFeedbackId(input.id),
        response: input.response,
      });
      return null;
    },

    async updateStatus(input: { id: string; status: FeedbackStatus }) {
      const updateFeedbackStatusFn = await getDep("updateFeedbackStatus");
      await updateFeedbackStatusFn({
        id: asFeedbackId(input.id),
        status: input.status,
      });
      return null;
    },
  };
};

export const feedbackService = createFeedbackService();

export async function createFeedbackRecord(input: {
  title: string;
  content: string;
  type?: FeedbackType;
  userId?: string | null;
}) {
  return await feedbackService.create(input);
}

export async function getFeedbackByIdPublic(id: string) {
  return await feedbackService.getById(id);
}

export async function getMineFeedbackById(input: { id: string; userId: string }) {
  return await feedbackService.getMineById(input);
}

export async function listFeedbackPublic(input?: { status?: FeedbackStatus; limit?: number }) {
  return await feedbackService.list(input);
}

export async function listMineFeedback(input: { userId: string; limit?: number }) {
  return await feedbackService.listMine(input);
}

export async function updateFeedbackResponsePublic(input: {
  id: string;
  response?: string | null;
}) {
  return await feedbackService.updateResponse(input);
}

export async function updateFeedbackStatusPublic(input: { id: string; status: FeedbackStatus }) {
  return await feedbackService.updateStatus(input);
}
