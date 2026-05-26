import type { CollectionId, SkillId, SnapshotId, UserId } from "@skills-re/db/utils";
import { asSkillId, asUserId } from "@skills-re/db/utils";

import { toSearchSkillItem } from "../shared/search-skill";
import type { SearchSkillRow } from "../shared/search-skill";
import { createDepGetter } from "../shared/deps";
import { findSkillBySlug } from "../skills/repo";
import type { SnapshotFileRow } from "../snapshots/repo";

interface CollectionRow {
  description: string;
  id: string;
  kind?: "custom" | "default";
  ownerHandle?: string | null;
  publicPath?: string;
  slug: string;
  status: "active" | "archived";
  title: string;
  userId: string;
  visibility: "public" | "private";
}

interface CollectionListRow {
  description: string;
  id: string;
  kind?: "custom" | "default";
  ownerHandle?: string | null;
  publicPath?: string;
  skillCount: number;
  slug: string;
  status?: "active" | "archived";
  title: string;
  visibility?: "public" | "private";
}

interface CollectionSkillRow extends SearchSkillRow {
  latestSnapshotId: SnapshotId | null;
  position: number;
}

interface LatestStaticAuditRow {
  isBlocked: boolean;
  overallScore: number;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  safeToPublish: boolean;
  status: "pass" | "fail";
  summary: string;
  syncTime: number;
}

interface CollectionStaticAudit {
  isBlocked: boolean;
  overallScore: number;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  safeToPublish: boolean;
  status: "pass" | "fail";
  summary: string;
  syncTime: number;
}

const normalizeCollectionSlug = (value: string) => {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replaceAll(/["'’]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return slug || "collection";
};

const toCollectionStaticAudit = (
  row: LatestStaticAuditRow | null,
): CollectionStaticAudit | undefined =>
  row
    ? {
        isBlocked: row.isBlocked,
        overallScore: row.overallScore,
        riskLevel: row.riskLevel,
        safeToPublish: row.safeToPublish,
        status: row.status,
        summary: row.summary,
        syncTime: row.syncTime,
      }
    : undefined;

interface CallerContext {
  isAdmin: boolean;
  userId: string;
}

interface CollectionsServiceDeps {
  countCollections: () => Promise<number>;
  listCollections: (input?: { cursor?: string; limit?: number }) => Promise<{
    continueCursor: string;
    isDone: boolean;
    page: CollectionListRow[];
  }>;
  listCollectionsByUserId: (input: { userId: UserId }) => Promise<CollectionListRow[]>;
  findCollectionBySlug: (slug: string) => Promise<CollectionRow | null>;
  findPublicCollectionByPath: (publicPath: string) => Promise<CollectionRow | null>;
  findCollectionById: (id: CollectionId) => Promise<CollectionRow | null>;
  findSkillBySlug: typeof findSkillBySlug;
  getOrCreateDefaultCollection: (input: { userId: UserId }) => Promise<{ id: string }>;
  getLatestStaticAuditBySnapshot: (snapshotId: SnapshotId) => Promise<LatestStaticAuditRow | null>;
  getSkillsByCollectionId: (collectionId: CollectionId) => Promise<CollectionSkillRow[]>;
  listSnapshotFiles: (snapshotId: SnapshotId) => Promise<SnapshotFileRow[]>;
  listSkillTags: (skillId: SkillId) => Promise<string[]>;
  insertCollection: (input: {
    description: string;
    slug: string;
    title: string;
    userId: UserId;
    visibility?: "public" | "private";
  }) => Promise<{ id: string }>;
  patchCollection: (input: {
    id: CollectionId;
    description?: string;
    slug?: string;
    status?: "active" | "archived";
    title?: string;
    visibility?: "public" | "private";
  }) => Promise<void>;
  deleteCollection: (id: CollectionId) => Promise<void>;
  insertCollectionSkill: (input: {
    collectionId: CollectionId;
    skillId: SkillId;
    position?: number;
  }) => Promise<{ created: boolean }> | Promise<void>;
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
    listCollectionsByUserId: repo.listCollectionsByUserId,
    findCollectionBySlug: repo.findCollectionBySlug,
    findPublicCollectionByPath: repo.findPublicCollectionByPath,
    findCollectionById: repo.findCollectionById,
    findSkillBySlug,
    getOrCreateDefaultCollection: repo.getOrCreateDefaultCollection,
    getLatestStaticAuditBySnapshot: async (snapshotId) => {
      const { getLatestStaticAuditBySnapshot } = await import("../static-audits/repo");
      return await getLatestStaticAuditBySnapshot(snapshotId);
    },
    getSkillsByCollectionId: repo.getSkillsByCollectionId,
    listSnapshotFiles: async (snapshotId) => {
      const { listSnapshotFiles } = await import("../snapshots/repo");
      return await listSnapshotFiles(snapshotId);
    },
    listSkillTags: async (skillId) => {
      const { listSkillTags } = await import("../tags/repo");
      return await listSkillTags(skillId);
    },
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

  const getCollectionSkillStats = async (skill: CollectionSkillRow) => {
    const listSkillTags = await getDep("listSkillTags");
    const tags = await listSkillTags(skill.id as SkillId);

    const stats: {
      latestSnapshotTotalBytes?: number;
      staticAudit?: CollectionStaticAudit;
      tags?: string[];
    } = {};

    if (skill.latestSnapshotId) {
      const [getLatestStaticAuditBySnapshot, listSnapshotFiles] = await Promise.all([
        getDep("getLatestStaticAuditBySnapshot"),
        getDep("listSnapshotFiles"),
      ]);
      const [staticAudit, files] = await Promise.all([
        getLatestStaticAuditBySnapshot(skill.latestSnapshotId),
        listSnapshotFiles(skill.latestSnapshotId),
      ]);

      if (files.length > 0) {
        stats.latestSnapshotTotalBytes = files.reduce((total, file) => total + file.size, 0);
      }

      const collectionStaticAudit = toCollectionStaticAudit(staticAudit);
      if (collectionStaticAudit) {
        stats.staticAudit = collectionStaticAudit;
      }
    }

    if (tags.length > 0) {
      stats.tags = tags;
    }

    return stats;
  };

  const assertOwnership = async (collectionId: string, caller: CallerContext) => {
    const findCollectionById = await getDep("findCollectionById");
    const collection = await findCollectionById(collectionId as CollectionId);
    if (!collection) {
      throw new Error("Collection not found.");
    }
    if (caller.isAdmin) {
      return collection;
    }
    if (collection.userId !== caller.userId) {
      throw new Error("Forbidden: you do not own this collection.");
    }
    return collection;
  };

  const toCollectionDetail = async (row: CollectionRow) => {
    const getSkillsByCollectionId = await getDep("getSkillsByCollectionId");
    const skills = await getSkillsByCollectionId(row.id as CollectionId);
    const skillsWithCollectionStats = await Promise.all(
      skills.map(async (skill) => {
        const stats = await getCollectionSkillStats(skill);
        return {
          ...toSearchSkillItem(skill),
          ...stats,
        };
      }),
    );

    return {
      description: row.description,
      id: row.id,
      kind: row.kind,
      ownerHandle: row.ownerHandle,
      publicPath: row.publicPath,
      skills: skillsWithCollectionStats,
      slug: row.slug,
      status: row.status,
      title: row.title,
      visibility: row.visibility,
    };
  };

  return {
    async countCollections() {
      const fn = await getDep("countCollections");
      return await fn();
    },

    async listCollections(input?: { cursor?: string; limit?: number }) {
      const fn = await getDep("listCollections");
      return await fn(input);
    },

    async listMineCollections(caller: CallerContext) {
      const getOrCreateDefaultCollection = await getDep("getOrCreateDefaultCollection");
      await getOrCreateDefaultCollection({ userId: asUserId(caller.userId) });

      const listCollectionsByUserId = await getDep("listCollectionsByUserId");
      return await listCollectionsByUserId({ userId: asUserId(caller.userId) });
    },

    async getCollectionBySlug(input: { slug: string }, caller?: Partial<CallerContext>) {
      const findPublicCollectionByPath = await getDep("findPublicCollectionByPath");
      const findCollectionBySlug = await getDep("findCollectionBySlug");
      const row =
        (await findPublicCollectionByPath(input.slug)) ?? (await findCollectionBySlug(input.slug));
      if (!(row && row.status === "active")) {
        return null;
      }
      if (
        row.visibility === "private" &&
        !(caller?.isAdmin || (caller?.userId && caller.userId === row.userId))
      ) {
        return null;
      }

      return await toCollectionDetail(row);
    },

    async getMineCollectionById(input: { id: string }, caller: CallerContext) {
      const collection = await assertOwnership(input.id, caller);
      if (collection.status !== "active") {
        return null;
      }
      return await toCollectionDetail(collection);
    },

    async createCollection(
      input: {
        description: string;
        slug: string;
        title: string;
        visibility?: "public" | "private";
      },
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
        visibility?: "public" | "private";
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

    async saveSkillToCollection(
      input: {
        collectionId?: string;
        newCollection?: {
          description?: string;
          slug?: string;
          title: string;
          visibility?: "public" | "private";
        };
        skillSlug: string;
        visibility?: "public" | "private";
      },
      caller: CallerContext,
    ) {
      const findSkillBySlugFn = await getDep("findSkillBySlug");
      const skill = await findSkillBySlugFn(input.skillSlug);

      if (!skill) {
        throw new Error("Skill not found.");
      }

      let { collectionId } = input;
      if (input.newCollection) {
        const insertCollection = await getDep("insertCollection");
        const created = await insertCollection({
          description: input.newCollection.description ?? "",
          slug: input.newCollection.slug ?? normalizeCollectionSlug(input.newCollection.title),
          title: input.newCollection.title,
          userId: asUserId(caller.userId),
          visibility: input.newCollection.visibility ?? "private",
        });
        collectionId = created.id;
      }

      if (!collectionId) {
        const getOrCreateDefaultCollection = await getDep("getOrCreateDefaultCollection");
        const defaultCollection = await getOrCreateDefaultCollection({
          userId: asUserId(caller.userId),
        });
        collectionId = defaultCollection.id;
      }

      await assertOwnership(collectionId, caller);

      if (input.visibility) {
        const patchCollection = await getDep("patchCollection");
        await patchCollection({
          id: collectionId as CollectionId,
          visibility: input.visibility,
        });
      }

      const insertCollectionSkill = await getDep("insertCollectionSkill");
      const result = await insertCollectionSkill({
        collectionId: collectionId as CollectionId,
        skillId: asSkillId(skill.id),
      });

      return {
        alreadySaved: result ? !result.created : false,
        collectionId,
        saved: true,
      };
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

export async function listCollectionsPublic(input?: { cursor?: string; limit?: number }) {
  return await createCollectionsService().listCollections(input);
}

export async function listMineCollections(caller: CallerContext) {
  return await createCollectionsService().listMineCollections(caller);
}

export async function getCollectionBySlug(
  input: { slug: string },
  caller?: Partial<CallerContext>,
) {
  return await createCollectionsService().getCollectionBySlug(input, caller);
}

export async function getMineCollectionById(input: { id: string }, caller: CallerContext) {
  return await createCollectionsService().getMineCollectionById(input, caller);
}

export async function createCollection(
  input: {
    description: string;
    slug: string;
    title: string;
    visibility?: "public" | "private";
  },
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
    visibility?: "public" | "private";
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

export async function saveSkillToCollection(
  input: {
    collectionId?: string;
    newCollection?: {
      description?: string;
      slug?: string;
      title: string;
      visibility?: "public" | "private";
    };
    skillSlug: string;
    visibility?: "public" | "private";
  },
  caller: CallerContext,
) {
  return await createCollectionsService().saveSkillToCollection(input, caller);
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
