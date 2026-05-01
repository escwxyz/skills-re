import { asSkillId, asUserId } from "@skills-re/db/utils";

import { createDepGetter } from "../shared/deps";
import { findSkillBySlug } from "../skills/repo";
import type { insertSavedSkill, listSavedSkillsByUserId } from "./repo";

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
  findSkillBySlug: typeof findSkillBySlug;
  insertSavedSkill: typeof insertSavedSkill;
  listSavedSkillsByUserId: typeof listSavedSkillsByUserId;
}

const createDefaultSavedSkillsDeps = async (): Promise<SavedSkillsDeps> => {
  const repo = await import("./repo");
  return {
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

    async listMine(input: { limit?: number; userId: string }) {
      const listSavedSkillsByUserIdFn = await getDep("listSavedSkillsByUserId");
      const rows = await listSavedSkillsByUserIdFn({
        limit: input.limit,
        userId: asUserId(input.userId),
      });

      return rows.map((row) => toOutputItem(row));
    },
  };
};

export const savedSkillsService = createSavedSkillsService();

export async function saveSkill(input: { slug: string; userId: string }) {
  return await savedSkillsService.save(input);
}

export async function listMineSavedSkills(input: { limit?: number; userId: string }) {
  return await savedSkillsService.listMine(input);
}
