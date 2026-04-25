import type { CollectionId, SkillId, UserId } from "@skills-re/db/utils";

import { toSearchSkillItem } from "../shared/search-skill";
import type { SearchSkillRow } from "../shared/search-skill";
import { createDepGetter } from "../shared/deps";

interface CollectionRow {
  description: string;
  id: string;
  slug: string;
  status?: "active" | "archived";
  title: string;
  userId: string;
}

interface CollectionListRow {
  description: string;
  id: string;
  skillCount: number;
  slug: string;
  title: string;
}

interface CollectionSkillRow extends SearchSkillRow {
  position: number;
}

interface CallerContext {
  isAdmin: boolean;
  userId: string;
}

interface CollectionsServiceDeps {
  countCollections: () => Promise<number>;
  listCollections: () => Promise<CollectionListRow[]>;
  findCollectionBySlug: (slug: string) => Promise<CollectionRow | null>;
  findCollectionById: (id: CollectionId) => Promise<CollectionRow | null>;
  getSkillsByCollectionId: (collectionId: CollectionId) => Promise<CollectionSkillRow[]>;
  insertCollection: (input: {
    description: string;
    slug: string;
    title: string;
    userId: UserId;
  }) => Promise<{ id: string }>;
  patchCollection: (input: {
    id: CollectionId;
    description?: string;
    slug?: string;
    status?: "active" | "archived";
    title?: string;
  }) => Promise<void>;
  deleteCollection: (id: CollectionId) => Promise<void>;
  insertCollectionSkill: (input: {
    collectionId: CollectionId;
    skillId: SkillId;
    position?: number;
  }) => Promise<void>;
  deleteCollectionSkill: (input: { collectionId: CollectionId; skillId: SkillId }) => Promise<void>;
  replaceCollectionSkills: (input: {
    collectionId: CollectionId;
    skillIds: SkillId[];
  }) => Promise<void>;
}

const createDefaultCollectionsDeps = async (): Promise<CollectionsServiceDeps> => {
  const repo = await import("./repo");
  return {
    countCollections: repo.countCollections,
    listCollections: repo.listCollections,
    findCollectionBySlug: repo.findCollectionBySlug,
    findCollectionById: repo.findCollectionById,
    getSkillsByCollectionId: repo.getSkillsByCollectionId,
    insertCollection: repo.insertCollection,
    patchCollection: repo.patchCollection,
    deleteCollection: repo.deleteCollection,
    insertCollectionSkill: repo.insertCollectionSkill,
    deleteCollectionSkill: repo.deleteCollectionSkill,
    replaceCollectionSkills: repo.replaceCollectionSkills,
  };
};

export const createCollectionsService = (overrides: Partial<CollectionsServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<CollectionsServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultCollectionsDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  const assertOwnership = async (collectionId: string, caller: CallerContext) => {
    if (caller.isAdmin) {
      return;
    }
    const findCollectionById = await getDep("findCollectionById");
    const collection = await findCollectionById(collectionId as CollectionId);
    if (!collection) {
      throw new Error("Collection not found.");
    }
    if (collection.userId !== caller.userId) {
      throw new Error("Forbidden: you do not own this collection.");
    }
  };

  return {
    async countCollections() {
      const fn = await getDep("countCollections");
      return await fn();
    },

    async listCollections() {
      const fn = await getDep("listCollections");
      return await fn();
    },

    async getCollectionBySlug(input: { slug: string }) {
      const findCollectionBySlug = await getDep("findCollectionBySlug");
      const row = await findCollectionBySlug(input.slug);
      if (!(row && row.status === "active")) {
        return null;
      }

      const getSkillsByCollectionId = await getDep("getSkillsByCollectionId");
      const skills = await getSkillsByCollectionId(row.id as CollectionId);

      return {
        description: row.description,
        id: row.id,
        skills: skills.map(toSearchSkillItem),
        slug: row.slug,
        title: row.title,
      };
    },

    async createCollection(
      input: { description: string; slug: string; title: string },
      caller: CallerContext,
    ) {
      const fn = await getDep("insertCollection");
      return await fn({ ...input, userId: caller.userId as UserId });
    },

    async updateCollection(
      input: {
        id: string;
        description?: string;
        slug?: string;
        status?: "active" | "archived";
        title?: string;
      },
      caller: CallerContext,
    ) {
      await assertOwnership(input.id, caller);
      const fn = await getDep("patchCollection");
      await fn({ ...input, id: input.id as CollectionId });
      return null;
    },

    async deleteCollection(input: { id: string }, caller: CallerContext) {
      await assertOwnership(input.id, caller);
      const fn = await getDep("deleteCollection");
      await fn(input.id as CollectionId);
      return null;
    },

    async addSkillToCollection(
      input: { collectionId: string; skillId: string; position?: number },
      caller: CallerContext,
    ) {
      await assertOwnership(input.collectionId, caller);
      const fn = await getDep("insertCollectionSkill");
      await fn({
        collectionId: input.collectionId as CollectionId,
        skillId: input.skillId as SkillId,
        position: input.position,
      });
      return null;
    },

    async removeSkillFromCollection(
      input: { collectionId: string; skillId: string },
      caller: CallerContext,
    ) {
      await assertOwnership(input.collectionId, caller);
      const fn = await getDep("deleteCollectionSkill");
      await fn({
        collectionId: input.collectionId as CollectionId,
        skillId: input.skillId as SkillId,
      });
      return null;
    },

    async setCollectionSkills(
      input: { collectionId: string; skillIds: string[] },
      caller: CallerContext,
    ) {
      await assertOwnership(input.collectionId, caller);
      const fn = await getDep("replaceCollectionSkills");
      await fn({
        collectionId: input.collectionId as CollectionId,
        skillIds: input.skillIds.map((id) => id as SkillId),
      });
      return null;
    },
  };
};

export async function countCollectionsPublic() {
  return await createCollectionsService().countCollections();
}

export async function listCollectionsPublic() {
  return await createCollectionsService().listCollections();
}

export async function getCollectionBySlug(input: { slug: string }) {
  return await createCollectionsService().getCollectionBySlug(input);
}

export async function createCollection(
  input: { description: string; slug: string; title: string },
  caller: CallerContext,
) {
  return await createCollectionsService().createCollection(input, caller);
}

export async function updateCollection(
  input: {
    id: string;
    description?: string;
    slug?: string;
    status?: "active" | "archived";
    title?: string;
  },
  caller: CallerContext,
) {
  return await createCollectionsService().updateCollection(input, caller);
}

export async function deleteCollection(input: { id: string }, caller: CallerContext) {
  return await createCollectionsService().deleteCollection(input, caller);
}

export async function addSkillToCollection(
  input: { collectionId: string; skillId: string; position?: number },
  caller: CallerContext,
) {
  return await createCollectionsService().addSkillToCollection(input, caller);
}

export async function removeSkillFromCollection(
  input: { collectionId: string; skillId: string },
  caller: CallerContext,
) {
  return await createCollectionsService().removeSkillFromCollection(input, caller);
}

export async function setCollectionSkills(
  input: { collectionId: string; skillIds: string[] },
  caller: CallerContext,
) {
  return await createCollectionsService().setCollectionSkills(input, caller);
}
