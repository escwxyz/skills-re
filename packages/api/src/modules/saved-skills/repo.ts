import { and, desc, eq, sql } from "drizzle-orm";

import { reposTable, savedSkillsTable, skillsTable } from "@skills-re/db/schema";
import { asSavedSkillId, asSkillId, asUserId, createId } from "@skills-re/db/utils";
import type { SkillId, UserId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import { decodeSavedSkillCursor, encodeSavedSkillCursor } from "./cursor";

export async function insertSavedSkill(
  input: {
    skillId: SkillId;
    userId: UserId;
  },
  database = db,
) {
  const rows = await database
    .insert(savedSkillsTable)
    .values({
      id: asSavedSkillId(createId()),
      skillId: asSkillId(input.skillId),
      userId: asUserId(input.userId),
    })
    .onConflictDoNothing({
      target: [savedSkillsTable.userId, savedSkillsTable.skillId],
    })
    .returning({
      createdAt: savedSkillsTable.createdAt,
      id: savedSkillsTable.id,
    });

  return rows[0] ?? null;
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

  const baseWhere = and(
    eq(savedSkillsTable.userId, input.userId),
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
      savedAt: savedSkillsTable.createdAt,
      savedId: savedSkillsTable.id,
      slug: skillsTable.slug,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(savedSkillsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, savedSkillsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(
      cursor
        ? and(
            baseWhere,
            sql`(${savedSkillsTable.createdAt}, ${savedSkillsTable.id}) < (${cursor.savedAt}, ${cursor.id})`,
          )
        : baseWhere,
    )
    .orderBy(desc(savedSkillsTable.createdAt), desc(savedSkillsTable.id))
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
  const rows = await database
    .select({ id: savedSkillsTable.id })
    .from(savedSkillsTable)
    .where(
      and(eq(savedSkillsTable.userId, input.userId), eq(savedSkillsTable.skillId, input.skillId)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function deleteSavedSkill(input: { skillId: SkillId; userId: UserId }, database = db) {
  await database
    .delete(savedSkillsTable)
    .where(
      and(eq(savedSkillsTable.userId, input.userId), eq(savedSkillsTable.skillId, input.skillId)),
    );
}
