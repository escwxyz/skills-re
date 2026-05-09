import { asSkillId, asUserId } from "@skills-re/db/utils";

import { createDepGetter } from "../shared/deps";
import { findSkillBySlug } from "../skills/repo";
import type {
  checkSavedSkill,
  deleteSavedSkill,
  insertSavedSkill,
  listSavedSkillsByUserId,
} from "./repo";

interface SavedSkillRow {
  authorHandle: string | null;
  createdAt: number;
  description: string;
  id: string;
  latestVersion: string | null;
  repoName: string | null;
  slug: string;
  title: string;
  updatedAt: number;
}

interface SavedSkillsDeps {
  checkSavedSkill: typeof checkSavedSkill;
  deleteSavedSkill: typeof deleteSavedSkill;
  findSkillBySlug: typeof findSkillBySlug;
  insertSavedSkill: typeof insertSavedSkill;
  listSavedSkillsByUserId: typeof listSavedSkillsByUserId;
}

const createDefaultSavedSkillsDeps = async (): Promise<SavedSkillsDeps> => {
  const repo = await import("./repo");
  return {
    checkSavedSkill: repo.checkSavedSkill,
    deleteSavedSkill: repo.deleteSavedSkill,
    findSkillBySlug,
    insertSavedSkill: repo.insertSavedSkill,
    listSavedSkillsByUserId: repo.listSavedSkillsByUserId,
  };
};

const toOutputItem = (row: SavedSkillRow) => ({
  authorHandle: row.authorHandle ?? undefined,
  createdAt: row.createdAt,
  description: row.description,
  id: row.id,
  latestVersion: row.latestVersion ?? undefined,
  repoName: row.repoName ?? undefined,
  slug: row.slug,
  title: row.title,
  updatedAt: row.updatedAt,
});

export const createSavedSkillsService = (overrides: Partial<SavedSkillsDeps> = {}) => {
  let defaultDepsPromise: Promise<SavedSkillsDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultSavedSkillsDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  return {
    async save(input: { slug: string; userId: string }) {
      const findSkillBySlugFn = await getDep("findSkillBySlug");
      const skill = await findSkillBySlugFn(input.slug);

      if (!skill) {
        throw new Error("Skill not found.");
      }

      const insertSavedSkillFn = await getDep("insertSavedSkill");
      const created = await insertSavedSkillFn({
        skillId: asSkillId(skill.id),
        userId: asUserId(input.userId),
      });

      return {
        alreadySaved: created === null,
        saved: true,
      };
    },

    async checkSaved(input: { slug: string; userId: string }) {
      const findSkillBySlugFn = await getDep("findSkillBySlug");
      const skill = await findSkillBySlugFn(input.slug);

      if (!skill) {
        return { saved: false };
      }

      const checkSavedSkillFn = await getDep("checkSavedSkill");
      const saved = await checkSavedSkillFn({
        skillId: asSkillId(skill.id),
        userId: asUserId(input.userId),
      });

      return { saved };
    },

    async unsave(input: { slug: string; userId: string }) {
      const findSkillBySlugFn = await getDep("findSkillBySlug");
      const skill = await findSkillBySlugFn(input.slug);

      if (!skill) {
        throw new Error("Skill not found.");
      }

      const deleteSavedSkillFn = await getDep("deleteSavedSkill");
      await deleteSavedSkillFn({
        skillId: asSkillId(skill.id),
        userId: asUserId(input.userId),
      });

      return { unsaved: true };
    },

    async listMine(input: { cursor?: string; limit?: number; userId: string }) {
      const listSavedSkillsByUserIdFn = await getDep("listSavedSkillsByUserId");
      const result = await listSavedSkillsByUserIdFn({
        cursor: input.cursor,
        limit: input.limit,
        userId: asUserId(input.userId),
      });

      return {
        continueCursor: result.continueCursor,
        isDone: result.isDone,
        page: result.page.map((row) => toOutputItem(row)),
      };
    },
  };
};

export const savedSkillsService = createSavedSkillsService();

export async function saveSkill(input: { slug: string; userId: string }) {
  return await savedSkillsService.save(input);
}

export async function checkSavedSkillByUser(input: { slug: string; userId: string }) {
  return await savedSkillsService.checkSaved(input);
}

export async function unsaveSkill(input: { slug: string; userId: string }) {
  return await savedSkillsService.unsave(input);
}

export async function listMineSavedSkills(input: {
  cursor?: string;
  limit?: number;
  userId: string;
}) {
  return await savedSkillsService.listMine(input);
}
