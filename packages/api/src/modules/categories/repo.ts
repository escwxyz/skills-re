import { and, asc, desc, eq, sql } from "drizzle-orm";

import {
  categoryCountsTable,
  reposTable,
  skillsTagsTable,
  skillsTable,
  tagsTable,
} from "@skills-re/db/schema";

import { db } from "../shared/db";
import { defaultLimit } from "../shared/pagination";
import { CATEGORY_DEFINITION_BY_SLUG, CATEGORY_DEFINITIONS } from "./taxonomy";

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

const mergeRuntimeCategory = (row: { count: number; slug: string }) => {
  const definition =
    CATEGORY_DEFINITION_BY_SLUG[row.slug as keyof typeof CATEGORY_DEFINITION_BY_SLUG];
  if (!definition) {
    return null;
  }

  return {
    count: row.count,
    id: definition.slug,
    name: definition.name,
    slug: definition.slug,
  };
};

export function countCategories() {
  return CATEGORY_DEFINITIONS.length;
}

export async function listCategories(input?: { all?: boolean; limit?: number }) {
  const limit = input?.limit ?? defaultLimit;
  const query = db
    .select({
      count: categoryCountsTable.count,
      slug: categoryCountsTable.slug,
    })
    .from(categoryCountsTable)
    .orderBy(desc(categoryCountsTable.count), asc(categoryCountsTable.slug));

  const runtimeRows = input?.all ? await query : await query.limit(limit);
  const runtimeBySlug = new Map(
    runtimeRows.map((row) => [
      row.slug,
      {
        count: row.count,
        slug: row.slug,
      },
    ]),
  );

  const categories = CATEGORY_DEFINITIONS.map((definition) => {
    const runtime = runtimeBySlug.get(definition.slug);
    return mergeRuntimeCategory(
      runtime ?? {
        count: 0,
        slug: definition.slug,
      },
    );
  }).filter((category): category is NonNullable<typeof category> => category !== null);

  return categories
    .toSorted((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.slug.localeCompare(right.slug);
    })
    .slice(0, input?.all ? undefined : limit);
}

export async function findCategoryBySlug(slug: string) {
  const definition = CATEGORY_DEFINITION_BY_SLUG[slug as keyof typeof CATEGORY_DEFINITION_BY_SLUG];
  if (!definition) {
    return null;
  }

  const rows = await db
    .select({
      count: categoryCountsTable.count,
      slug: categoryCountsTable.slug,
    })
    .from(categoryCountsTable)
    .where(eq(categoryCountsTable.slug, slug))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return {
      count: 0,
      id: definition.slug,
      name: definition.name,
      slug: definition.slug,
    };
  }

  return {
    count: row.count,
    id: definition.slug,
    name: definition.name,
    slug: definition.slug,
  };
}

export function listCategoriesForAi(input?: { limit?: number }) {
  const slugs = CATEGORY_DEFINITIONS.map((definition) => definition.slug);
  return input?.limit ? slugs.slice(0, input.limit) : slugs;
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
  const rows = await db
    .select({
      value: sql<number>`count(*)`,
    })
    .from(skillsTable)
    .where(and(eq(skillsTable.primaryCategory, categoryId), eq(skillsTable.visibility, "public")));

  return rows[0]?.value ?? 0;
}

export async function patchCategoryCount(input: { categoryId: string; count: number }) {
  await db
    .insert(categoryCountsTable)
    .values({
      count: input.count,
      slug: input.categoryId,
    })
    .onConflictDoUpdate({
      target: categoryCountsTable.slug,
      set: {
        count: input.count,
        updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      },
    });
}
