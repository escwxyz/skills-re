import { and, desc, eq, sql } from "drizzle-orm";

import { collectionsSkillsTable, reposTable, skillsTable } from "@skills-re/db/schema";
import { asCollectionSkillId, asSkillId, asUserId, createId } from "@skills-re/db/utils";
import type { SkillId, UserId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import { findDefaultCollectionByUserId, getOrCreateDefaultCollection } from "../collections/repo";
import { decodeSavedSkillCursor, encodeSavedSkillCursor } from "./cursor";

export async function insertSavedSkill(
  input: {
    skillId: SkillId;
    userId: UserId;
  },
  database = db,
) {
  return await database.transaction(async (tx) => {
    const defaultCollection = await getOrCreateDefaultCollection(
      { userId: asUserId(input.userId) },
      tx,
    );
    const rows = await tx
      .insert(collectionsSkillsTable)
      .values({
        collectionId: defaultCollection.id,
        id: asCollectionSkillId(createId()),
        skillId: asSkillId(input.skillId),
      })
      .onConflictDoNothing({
        target: [collectionsSkillsTable.collectionId, collectionsSkillsTable.skillId],
      })
      .returning({
        createdAt: collectionsSkillsTable.createdAt,
        id: collectionsSkillsTable.id,
      });

    return rows[0] ?? null;
  });
}

export async function listSavedSkillsByUserId(
  input: {
    cursor?: string;
    limit?: number;
    userId: UserId;
  },
  database = db,
) {
  const limit = input.limit ?? 20;
  const cursor = decodeSavedSkillCursor(input.cursor);
  const defaultCollection = await getOrCreateDefaultCollection(
    { userId: asUserId(input.userId) },
    database,
  );

  const baseWhere = and(
    eq(collectionsSkillsTable.collectionId, defaultCollection.id),
    eq(skillsTable.visibility, "public"),
  );

  const rows = await database
    .select({
      authorHandle: reposTable.ownerHandle,
      createdAt: skillsTable.createdAt,
      description: skillsTable.description,
      id: skillsTable.id,
      latestVersion: skillsTable.latestVersion,
      repoName: reposTable.name,
      savedAt: collectionsSkillsTable.createdAt,
      savedId: collectionsSkillsTable.id,
      slug: skillsTable.slug,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(collectionsSkillsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, collectionsSkillsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(
      cursor
        ? and(
            baseWhere,
            sql`(${collectionsSkillsTable.createdAt}, ${collectionsSkillsTable.id}) < (${cursor.savedAt}, ${cursor.id})`,
          )
        : baseWhere,
    )
    .orderBy(desc(collectionsSkillsTable.createdAt), desc(collectionsSkillsTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const lastRow = page.at(-1);

  return {
    continueCursor: encodeSavedSkillCursor(
      lastRow ? { id: lastRow.savedId, savedAt: lastRow.savedAt.getTime() } : null,
    ),
    isDone: rows.length <= limit,
    page: page.map(({ savedAt: _savedAt, savedId: _savedId, ...rest }) => rest),
  };
}

export async function checkSavedSkill(
  input: { skillId: SkillId; userId: UserId },
  database = db,
): Promise<boolean> {
  const defaultCollection = await findDefaultCollectionByUserId(
    { userId: asUserId(input.userId) },
    database,
  );
  if (!defaultCollection) {
    return false;
  }

  const rows = await database
    .select({ id: collectionsSkillsTable.id })
    .from(collectionsSkillsTable)
    .where(
      and(
        eq(collectionsSkillsTable.collectionId, defaultCollection.id),
        eq(collectionsSkillsTable.skillId, input.skillId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function deleteSavedSkill(input: { skillId: SkillId; userId: UserId }, database = db) {
  const defaultCollection = await findDefaultCollectionByUserId(
    { userId: asUserId(input.userId) },
    database,
  );
  if (!defaultCollection) {
    return;
  }

  await database
    .delete(collectionsSkillsTable)
    .where(
      and(
        eq(collectionsSkillsTable.collectionId, defaultCollection.id),
        eq(collectionsSkillsTable.skillId, input.skillId),
      ),
    );
}
