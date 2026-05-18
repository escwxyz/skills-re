import { asSkillId, asUserId } from "@skills-re/db/utils";

import { createDepGetter } from "../shared/deps";
import { listMineSavedSkills } from "../saved-skills/service";
import { findSkillBySlug } from "../skills/repo";
import type { insertSkillUsageEvent, listSkillUsageEventsByUserId } from "./repo";

export interface RecordSkillUsageInput {
  agentName?: string;
  projectContext?: string;
  skillPath?: string;
  skillSlug: string;
  taskDescription?: string;
  userId: string;
}

export interface SkillRecommendationInput {
  limit?: number;
  projectContext?: string;
  taskDescription?: string;
  userId: string;
}

interface SkillUsageDeps {
  findSkillBySlug: typeof findSkillBySlug;
  insertSkillUsageEvent: typeof insertSkillUsageEvent;
  listMineSavedSkills: typeof listMineSavedSkills;
  listSkillUsageEventsByUserId: typeof listSkillUsageEventsByUserId;
}

const trimOptional = (value: string | undefined, maxLength: number) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const sanitizeProjectContext = (value: string | undefined) =>
  trimOptional(value, 2000)
    ?.replaceAll(/\/Users\/[^/\s]+/g, "/Users/[redacted]")
    .replaceAll(/[A-Z]:\\Users\\[^\\\s]+/gi, "C:\\Users\\[redacted]");

const createDefaultSkillUsageDeps = async (): Promise<SkillUsageDeps> => {
  const repo = await import("./repo");
  return {
    findSkillBySlug,
    insertSkillUsageEvent: repo.insertSkillUsageEvent,
    listMineSavedSkills,
    listSkillUsageEventsByUserId: repo.listSkillUsageEventsByUserId,
  };
};

const toUsageOutput = (row: Awaited<ReturnType<typeof listSkillUsageEventsByUserId>>[number]) => ({
  agentName: row.agentName ?? undefined,
  authorHandle: row.authorHandle ?? undefined,
  id: row.id,
  projectContext: row.projectContext ?? undefined,
  repoName: row.repoName ?? undefined,
  skillId: row.skillId ?? undefined,
  skillPath: row.skillPath ?? undefined,
  skillSlug: row.skillSlug,
  taskDescription: row.taskDescription ?? undefined,
  title: row.title ?? undefined,
  usedAt: row.usedAt,
});

export const createSkillUsageService = (overrides: Partial<SkillUsageDeps> = {}) => {
  let defaultDepsPromise: Promise<SkillUsageDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultSkillUsageDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  const service = {
    async record(input: RecordSkillUsageInput) {
      const skillSlug = input.skillSlug.trim();
      if (!skillSlug) {
        throw new Error("skillSlug is required.");
      }

      const findSkillBySlugFn = await getDep("findSkillBySlug");
      const skill = await findSkillBySlugFn(skillSlug);
      const insertSkillUsageEventFn = await getDep("insertSkillUsageEvent");
      const created = await insertSkillUsageEventFn({
        agentName: trimOptional(input.agentName, 120),
        projectContext: sanitizeProjectContext(input.projectContext),
        skillId: skill ? asSkillId(skill.id) : null,
        skillPath: trimOptional(input.skillPath, 400),
        skillSlug,
        taskDescription: trimOptional(input.taskDescription, 1000),
        userId: asUserId(input.userId),
      });

      return {
        id: created.id,
        recorded: true,
        skillFound: Boolean(skill),
        usedAt: created.usedAt,
      };
    },

    async listRecent(input: { limit?: number; userId: string }) {
      const listSkillUsageEventsByUserIdFn = await getDep("listSkillUsageEventsByUserId");
      const rows = await listSkillUsageEventsByUserIdFn({
        limit: input.limit,
        userId: asUserId(input.userId),
      });
      return {
        page: rows.map(toUsageOutput),
      };
    },

    async recommend(input: SkillRecommendationInput) {
      const limit = input.limit ?? 5;
      const [recent, saved] = await Promise.all([
        service.listRecent({ limit: 20, userId: input.userId }),
        (await getDep("listMineSavedSkills"))({
          limit: 20,
          userId: asUserId(input.userId),
        }),
      ]);

      const seen = new Set<string>();
      const recommendations = [
        ...saved.page.map((skill) => ({
          reason: "Saved in your Skills.re library.",
          skill,
        })),
        ...recent.page.map((event) => ({
          reason: event.taskDescription
            ? `Recently used for: ${event.taskDescription}`
            : "Recently used by your agent.",
          skill: {
            authorHandle: event.authorHandle,
            description: "",
            id: event.skillId ?? event.id,
            latestVersion: undefined,
            repoName: event.repoName,
            slug: event.skillSlug,
            title: event.title ?? event.skillSlug,
            updatedAt: event.usedAt,
          },
        })),
      ].filter(({ skill }) => {
        if (seen.has(skill.slug)) {
          return false;
        }
        seen.add(skill.slug);
        return true;
      });

      return {
        page: recommendations.slice(0, limit),
        query: trimOptional(input.taskDescription ?? input.projectContext, 500),
      };
    },
  };
  return service;
};

export const skillUsageService = createSkillUsageService();

export async function recordSkillUsage(input: RecordSkillUsageInput) {
  return await skillUsageService.record(input);
}

export async function listMyRecentSkillUsage(input: { limit?: number; userId: string }) {
  return await skillUsageService.listRecent(input);
}

export async function getSkillRecommendations(input: SkillRecommendationInput) {
  return await skillUsageService.recommend(input);
}
