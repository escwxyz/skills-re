import { and, asc, count, eq, sql } from "drizzle-orm";

import {
  collectionsSkillsTable,
  collectionsTable,
  reposTable,
  skillsTable,
} from "@skills-re/db/schema";
import type { CollectionId, SkillId, UserId } from "@skills-re/db/utils";
import { asCollectionId, asSkillId, createId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import { defaultLimit } from "../shared/pagination";
import { decodeCollectionCursor, encodeCollectionCursor } from "./cursor";

const COLLECTIONS_LIST_LIMIT_MAX = 100;

const toSkillRows = () => ({
  authorHandle: reposTable.ownerHandle,
  createdAt: skillsTable.createdAt,
  description: skillsTable.description,
  downloadsAllTime: skillsTable.downloadsAllTime,
  downloadsTrending: skillsTable.downloadsTrending,
  forkCount: reposTable.forks,
  id: skillsTable.id,
  isVerified: skillsTable.isVerified,
  latestVersion: skillsTable.latestVersion,
  latestSnapshotId: skillsTable.latestSnapshotId,
  license: reposTable.license,
  primaryCategory: skillsTable.primaryCategory,
  repoName: reposTable.name,
  repoUrl: reposTable.url,
  slug: skillsTable.slug,
  stargazerCount: reposTable.stars,
  syncTime: skillsTable.syncTime,
  title: skillsTable.title,
  updatedAt: skillsTable.updatedAt,
  viewsAllTime: skillsTable.viewsAllTime,
});

export async function countCollections() {
  const rows = await db
    .select({ value: sql<number>`count(*)` })
    .from(collectionsTable)
    .where(eq(collectionsTable.status, "active"));

  return rows[0]?.value ?? 0;
}

export async function listCollections(input?: { cursor?: string; limit?: number }) {
  const limit = Math.min(Math.max(1, input?.limit ?? defaultLimit), COLLECTIONS_LIST_LIMIT_MAX);
  const cursor = decodeCollectionCursor(input?.cursor);

  const skillCounts = db
    .select({
      collectionId: collectionsSkillsTable.collectionId,
      skillCount: count(collectionsSkillsTable.skillId).as("skill_count"),
    })
    .from(collectionsSkillsTable)
    .groupBy(collectionsSkillsTable.collectionId)
    .as("skill_counts");

  const rows = await db
    .select({
      description: collectionsTable.description,
      id: collectionsTable.id,
      skillCount: sql<number>`coalesce(${skillCounts.skillCount}, 0)`,
      slug: collectionsTable.slug,
      title: collectionsTable.title,
    })
    .from(collectionsTable)
    .leftJoin(skillCounts, eq(skillCounts.collectionId, collectionsTable.id))
    .where(
      cursor
        ? and(
            eq(collectionsTable.status, "active"),
            sql`(${collectionsTable.title}, ${collectionsTable.id}) > (${cursor.title}, ${cursor.id})`,
          )
        : eq(collectionsTable.status, "active"),
    )
    .orderBy(asc(collectionsTable.title))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;

  return {
    continueCursor: encodeCollectionCursor(
      rows.length > limit && next
        ? {
            id: next.id,
            title: next.title,
          }
        : null,
    ),
    isDone: rows.length <= limit,
    page,
  };
}

export async function findCollectionBySlug(slug: string) {
  const rows = await db
    .select({
      description: collectionsTable.description,
      id: collectionsTable.id,
      slug: collectionsTable.slug,
      status: collectionsTable.status,
      title: collectionsTable.title,
      userId: collectionsTable.userId,
    })
    .from(collectionsTable)
    .where(eq(collectionsTable.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

export async function findCollectionById(id: CollectionId) {
  const rows = await db
    .select({
      description: collectionsTable.description,
      id: collectionsTable.id,
      slug: collectionsTable.slug,
      status: collectionsTable.status,
      title: collectionsTable.title,
      userId: collectionsTable.userId,
    })
    .from(collectionsTable)
    .where(eq(collectionsTable.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function getSkillsByCollectionId(collectionId: CollectionId) {
  const rows = await db
    .select({
      ...toSkillRows(),
      position: collectionsSkillsTable.position,
    })
    .from(collectionsSkillsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, collectionsSkillsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(
      and(
        eq(collectionsSkillsTable.collectionId, collectionId),
        eq(skillsTable.visibility, "public"),
      ),
    )
    .orderBy(asc(collectionsSkillsTable.position), asc(skillsTable.title));

  return rows;
}

export async function insertCollection(input: {
  description: string;
  slug: string;
  title: string;
  userId: UserId;
}) {
  const id = createId() as CollectionId;
  await db.insert(collectionsTable).values({
    id,
    description: input.description,
    slug: input.slug,
    title: input.title,
    status: "active",
    userId: input.userId,
  });
  return { id };
}

export async function patchCollection(input: {
  id: CollectionId;
  description?: string;
  slug?: string;
  status?: "active" | "archived";
  title?: string;
}) {
  const { id, ...fields } = input;
  if (Object.keys(fields).length === 0) {
    return;
  }

  await db.update(collectionsTable).set(fields).where(eq(collectionsTable.id, id));
}

export async function deleteCollection(id: CollectionId) {
  await db.delete(collectionsTable).where(eq(collectionsTable.id, id));
}

export async function insertCollectionSkill(input: {
  collectionId: CollectionId;
  skillId: SkillId;
  position?: number;
}) {
  await db.insert(collectionsSkillsTable).values({
    collectionId: input.collectionId,
    skillId: input.skillId,
    position: input.position ?? 0,
  });
}

export async function deleteCollectionSkill(input: {
  collectionId: CollectionId;
  skillId: SkillId;
}) {
  await db
    .delete(collectionsSkillsTable)
    .where(
      and(
        eq(collectionsSkillsTable.collectionId, input.collectionId),
        eq(collectionsSkillsTable.skillId, input.skillId),
      ),
    );
}

export async function replaceCollectionSkills(
  input: {
    collectionId: CollectionId;
    skillIds: SkillId[];
  },
  database = db,
) {
  await database.transaction(async (tx) => {
    await tx
      .delete(collectionsSkillsTable)
      .where(eq(collectionsSkillsTable.collectionId, input.collectionId));

    if (input.skillIds.length === 0) {
      return;
    }

    await tx.insert(collectionsSkillsTable).values(
      input.skillIds.map((skillId, index) => ({
        collectionId: input.collectionId,
        skillId,
        position: index,
      })),
    );
  });
}

export { asCollectionId, asSkillId };
