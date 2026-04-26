import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  categoriesTable,
  reposTable,
  snapshotsTable,
  skillsTagsTable,
  skillsTable,
  tagsTable,
} from "@skills-re/db/schema";
import type { SkillId, TagId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import { defaultLimit } from "../shared/pagination";

const toTopSkillRows = () => ({
  authorHandle: reposTable.ownerHandle,
  createdAt: skillsTable.createdAt,
  description: skillsTable.description,
  downloadsAllTime: skillsTable.downloadsAllTime,
  downloadsTrending: skillsTable.downloadsTrending,
  forkCount: reposTable.forks,
  id: skillsTable.id,
  isVerified: skillsTable.isVerified,
  latestVersion: skillsTable.latestVersion,
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

export async function countTags() {
  const rows = await db
    .select({
      value: sql<number>`count(*)`,
    })
    .from(tagsTable)
    .where(and(eq(tagsTable.status, "active"), sql`${tagsTable.count} > 0`));

  return rows[0]?.value ?? 0;
}

export async function listTags(input?: { all?: boolean; limit?: number }) {
  const limit = input?.limit ?? defaultLimit;
  const query = db
    .select({
      count: tagsTable.count,
      id: tagsTable.id,
      status: tagsTable.status,
      slug: tagsTable.slug,
    })
    .from(tagsTable)
    .orderBy(desc(tagsTable.count), desc(tagsTable.slug));

  const rows = input?.all ? await query : await query.limit(limit);
  return rows;
}

export async function findTagBySlug(slug: string) {
  const rows = await db
    .select({
      count: tagsTable.count,
      id: tagsTable.id,
      status: tagsTable.status,
      slug: tagsTable.slug,
    })
    .from(tagsTable)
    .where(eq(tagsTable.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

export async function listTagsForSeo(limit?: number) {
  return await listTags({ limit });
}

export async function listIndexableTags(limit?: number) {
  return await listTags({ limit });
}

export async function getRelatedCategoriesByTagSlug(slug: string) {
  const taggedSkillIds = db
    .select({
      skillId: skillsTagsTable.skillId,
    })
    .from(skillsTagsTable)
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(eq(tagsTable.slug, slug));

  const rows = await db
    .select({
      count: sql<number>`count(distinct ${skillsTable.id})`,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
    })
    .from(skillsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.slug, skillsTable.primaryCategory))
    .where(
      and(
        inArray(skillsTable.id, taggedSkillIds),
        eq(skillsTable.visibility, "public"),
        sql`${skillsTable.primaryCategory} is not null`,
      ),
    )
    .groupBy(categoriesTable.slug, categoriesTable.name);

  return rows;
}

export async function getRelatedTagsByTagSlug(slug: string) {
  const taggedSkillIds = db
    .select({
      skillId: skillsTagsTable.skillId,
    })
    .from(skillsTagsTable)
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(eq(tagsTable.slug, slug));

  const rows = await db
    .select({
      count: sql<number>`count(distinct ${skillsTable.id})`,
      slug: tagsTable.slug,
    })
    .from(skillsTagsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, skillsTagsTable.skillId))
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(
      and(
        inArray(skillsTable.id, taggedSkillIds),
        eq(skillsTable.visibility, "public"),
        sql`${tagsTable.slug} <> ${slug}`,
      ),
    )
    .groupBy(tagsTable.slug);

  return rows;
}

export async function getTopSkillsByTagSlug(slug: string, limit = defaultLimit) {
  const rows = await db
    .select(toTopSkillRows())
    .from(skillsTagsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, skillsTagsTable.skillId))
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(tagsTable.slug, slug), eq(skillsTable.visibility, "public")))
    .orderBy(desc(skillsTable.syncTime), desc(skillsTable.id))
    .limit(limit);

  return rows;
}

export async function getSkillById(skillId: SkillId) {
  const rows = await db
    .select({
      id: skillsTable.id,
    })
    .from(skillsTable)
    .where(eq(skillsTable.id, skillId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listSkillIdsWithoutTags(input?: { limit?: number }) {
  const limit = input?.limit ?? 50;

  const rows = await db
    .select({
      id: skillsTable.id,
    })
    .from(skillsTable)
    .leftJoin(skillsTagsTable, eq(skillsTagsTable.skillId, skillsTable.id))
    .where(isNull(skillsTagsTable.tagId))
    .orderBy(desc(skillsTable.syncTime), desc(skillsTable.id))
    .limit(limit);

  return rows.map((row) => row.id);
}

export async function listSkillTaggingTargetsByIds(skillIds: SkillId[]) {
  if (skillIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      description: skillsTable.description,
      id: skillsTable.id,
      latestSnapshotEntryPath: snapshotsTable.entryPath,
      latestSnapshotId: skillsTable.latestSnapshotId,
      slug: skillsTable.slug,
      title: skillsTable.title,
    })
    .from(skillsTable)
    .leftJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .where(inArray(skillsTable.id, skillIds))
    .orderBy(skillsTable.id);

  return rows
    .filter((row) => row.latestSnapshotId && row.latestSnapshotEntryPath)
    .map((row) => ({
      description: row.description,
      id: row.id,
      latestSnapshotEntryPath: row.latestSnapshotEntryPath as string,
      latestSnapshotId: row.latestSnapshotId as string,
      slug: row.slug,
      title: row.title,
    }));
}

export async function findTagsBySlugs(slugs: string[]) {
  if (slugs.length === 0) {
    return [];
  }

  return await db
    .select({
      count: tagsTable.count,
      id: tagsTable.id,
      promotedAt: tagsTable.promotedAt,
      slug: tagsTable.slug,
      status: tagsTable.status,
    })
    .from(tagsTable)
    .where(inArray(tagsTable.slug, slugs));
}

export async function insertTag(input: {
  slug: string;
  status?: "active" | "pending";
  promotedAt?: number | null;
}) {
  const rows = await db
    .insert(tagsTable)
    .values({
      count: 0,
      promotedAt: input.promotedAt ?? null,
      slug: input.slug,
      status: input.status ?? "active",
    })
    .onConflictDoNothing({
      target: tagsTable.slug,
    })
    .returning({
      id: tagsTable.id,
    });

  return rows[0]?.id ?? null;
}

export async function listSkillTagLinks(skillId: SkillId) {
  return await db
    .select({
      tagId: skillsTagsTable.tagId,
    })
    .from(skillsTagsTable)
    .where(eq(skillsTagsTable.skillId, skillId));
}

export async function listSkillTags(skillId: SkillId) {
  const rows = await db
    .select({
      slug: tagsTable.slug,
    })
    .from(skillsTagsTable)
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(eq(skillsTagsTable.skillId, skillId))
    .orderBy(tagsTable.slug);

  return rows.map((row) => row.slug);
}

export async function addSkillTagLinks(input: { skillId: SkillId; tagIds: TagId[] }) {
  if (input.tagIds.length === 0) {
    return;
  }

  await db.insert(skillsTagsTable).values(
    input.tagIds.map((tagId) => ({
      createdAt: Date.now(),
      skillId: input.skillId,
      tagId,
    })),
  );
}

export async function removeSkillTagLinks(input: { skillId: SkillId; tagIds: TagId[] }) {
  for (const tagId of input.tagIds) {
    await db
      .delete(skillsTagsTable)
      .where(
        sql`${skillsTagsTable.skillId} = ${input.skillId} AND ${skillsTagsTable.tagId} = ${tagId}`,
      );
  }
}

export async function patchSkillSyncTime(skillId: SkillId, syncTime: number) {
  await db
    .update(skillsTable)
    .set({
      syncTime,
    })
    .where(eq(skillsTable.id, skillId));
}

export async function computeSkillCountForTag(tagId: TagId) {
  const rows = await db
    .select({
      value: count(),
    })
    .from(skillsTagsTable)
    .where(eq(skillsTagsTable.tagId, tagId));

  return rows[0]?.value ?? 0;
}

export async function patchTagCount(input: { count: number; tagId: TagId }) {
  await db
    .update(tagsTable)
    .set({
      count: input.count,
    })
    .where(eq(tagsTable.id, input.tagId));
}
