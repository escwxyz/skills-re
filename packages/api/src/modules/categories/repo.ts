import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import {
  categoriesTable,
  reposTable,
  skillsTagsTable,
  skillsTable,
  tagsTable,
} from "@skills-re/db/schema";
import { asCategoryId } from "@skills-re/db/utils";

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

export async function countCategories() {
  const rows = await db
    .select({
      value: sql<number>`count(*)`,
    })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.status, "active"), sql`${categoriesTable.count} > 0`));

  return rows[0]?.value ?? 0;
}

export async function listCategories(input?: { all?: boolean; limit?: number }) {
  const limit = input?.limit ?? defaultLimit;
  const query = db
    .select({
      count: categoriesTable.count,
      description: categoriesTable.description,
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      status: categoriesTable.status,
    })
    .from(categoriesTable)
    .orderBy(desc(categoriesTable.count), asc(categoriesTable.slug));

  const rows = input?.all ? await query : await query.limit(limit);
  return rows;
}

export async function findCategoryBySlug(slug: string) {
  const rows = await db
    .select({
      count: categoriesTable.count,
      description: categoriesTable.description,
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      status: categoriesTable.status,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

export async function listCategoriesForAi(input?: { limit?: number }) {
  const query = db
    .select({
      slug: categoriesTable.slug,
      status: categoriesTable.status,
    })
    .from(categoriesTable)
    .orderBy(desc(categoriesTable.count), asc(categoriesTable.slug));

  const rows = input?.limit ? await query.limit(input.limit) : await query;
  return rows.map((row) => row.slug);
}

export async function listCategoryDefinitions(input?: { statuses?: ("active" | "deprecated")[] }) {
  const statuses =
    input?.statuses && input.statuses.length > 0 ? input.statuses : (["active"] as const);

  return await db
    .select({
      count: categoriesTable.count,
      description: categoriesTable.description,
      id: categoriesTable.id,
      keywords: categoriesTable.keywords,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      status: categoriesTable.status,
    })
    .from(categoriesTable)
    .where(inArray(categoriesTable.status, statuses))
    .orderBy(categoriesTable.slug);
}

export async function getRelatedTagsByCategorySlug(slug: string) {
  const rows = await db
    .select({
      count: sql<number>`count(distinct ${skillsTable.id})`,
      slug: tagsTable.slug,
    })
    .from(skillsTable)
    .innerJoin(skillsTagsTable, eq(skillsTagsTable.skillId, skillsTable.id))
    .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(and(eq(skillsTable.primaryCategory, slug), eq(skillsTable.visibility, "public")))
    .groupBy(tagsTable.slug);

  return rows;
}

export async function getTopSkillsByCategorySlug(slug: string, limit = defaultLimit) {
  const rows = await db
    .select(toTopSkillRows())
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(skillsTable.primaryCategory, slug), eq(skillsTable.visibility, "public")))
    .orderBy(desc(skillsTable.syncTime), desc(skillsTable.id))
    .limit(limit);

  return rows;
}

export async function computeSkillCountForCategory(categoryId: string) {
  const typedCategoryId = asCategoryId(categoryId);
  const rows = await db
    .select({
      value: count(),
    })
    .from(skillsTable)
    .where(eq(skillsTable.categoryId, typedCategoryId));

  return rows[0]?.value ?? 0;
}

export async function patchCategoryCount(input: { categoryId: string; count: number }) {
  const typedCategoryId = asCategoryId(input.categoryId);
  await db
    .update(categoriesTable)
    .set({
      count: input.count,
    })
    .where(eq(categoriesTable.id, typedCategoryId));
}
