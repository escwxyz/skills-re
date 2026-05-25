import { asFeedbackId, asSkillId, asUserId } from "@skills-re/db/utils";
import { createDepGetter } from "../shared/deps";

import type {
  countFeedbackByUser,
  createFeedback,
  FeedbackRow,
  FeedbackStatus,
  FeedbackType,
  findSkillClaimContextById,
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
  skillId: row.skillId,
  skillSlug: row.skillSlug,
  skillTitle: row.skillTitle,
  status: row.status,
  title: row.title,
  type: row.type,
  userId: row.userId ?? "",
});

interface FeedbackServiceDeps {
  countFeedbackByUser: typeof countFeedbackByUser;
  createFeedback: typeof createFeedback;
  findSkillClaimContextById: typeof findSkillClaimContextById;
  findSkillById: (id: string) => Promise<{ slug: string; title: string } | null>;
  getFeedbackById: typeof getFeedbackById;
  getFeedbackByIdAndUser: typeof getFeedbackByIdAndUser;
  listFeedback: typeof listFeedback;
  listFeedbackByUser: typeof listFeedbackByUser;
  updateFeedbackResponse: typeof updateFeedbackResponse;
  updateFeedbackStatus: typeof updateFeedbackStatus;
}

const createDefaultFeedbackDeps = async (): Promise<FeedbackServiceDeps> => {
  const repo = await import("./repo");
  const skillsRepo = await import("../skills/repo");
  return {
    countFeedbackByUser: repo.countFeedbackByUser,
    createFeedback: repo.createFeedback,
    findSkillClaimContextById: repo.findSkillClaimContextById,
    findSkillById: skillsRepo.findSkillById,
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
      skillId?: string | null;
      skillSlug?: string | null;
      skillTitle?: string | null;
      type?: FeedbackType;
      userId?: string | null;
    }) {
      const createFeedbackFn = await getDep("createFeedback");
      const isSkillReport = input.type?.startsWith("skill_") ?? false;
      const skillId = input.skillId ? asSkillId(input.skillId) : null;
      let skillSlug = input.skillSlug ?? null;
      let skillTitle = input.skillTitle ?? null;

      if (isSkillReport) {
        if (!skillId) {
          throw new Error("Skill report requires a skill id.");
        }

        const findSkillByIdFn = await getDep("findSkillById");
        const skill = await findSkillByIdFn(skillId);
        if (!skill) {
          throw new Error("Skill not found.");
        }

        skillSlug = skill.slug;
        skillTitle = skill.title;
      }

      if (input.type === "skill_takedown") {
        if (!(skillId && input.userId)) {
          throw new Error("Only the claimed author can request Skill removal.");
        }

        const findSkillClaimContextByIdFn = await getDep("findSkillClaimContextById");
        const claimContext = await findSkillClaimContextByIdFn(skillId);
        if (claimContext?.claimedUserId !== input.userId) {
          throw new Error("Only the claimed author can request Skill removal.");
        }
      }

      const id = await createFeedbackFn({
        content: input.content,
        skillId,
        skillSlug,
        skillTitle,
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

    async countMine(input: { userId: string }) {
      const countFn = await getDep("countFeedbackByUser");
      const userId = asUserId(input.userId);
      const [total, pending] = await Promise.all([
        countFn({ userId }),
        countFn({ userId, status: "pending" }),
      ]);
      return { pending, total };
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
  skillId?: string | null;
  skillSlug?: string | null;
  skillTitle?: string | null;
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

export async function countMineFeedback(input: { userId: string }) {
  return await feedbackService.countMine(input);
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
