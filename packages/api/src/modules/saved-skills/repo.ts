import { and, desc, eq } from "drizzle-orm";

import { reposTable, savedSkillsTable, skillsTable } from "@skills-re/db/schema";
import { asSavedSkillId, asSkillId, asUserId, createId } from "@skills-re/db/utils";
import type { SkillId, UserId } from "@skills-re/db/utils";

import { db } from "../shared/db";

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
    limit?: number;
    userId: UserId;
  },
  database = db,
) {
  const limit = input.limit ?? 100;

  return await database
    .select({
      authorHandle: reposTable.ownerHandle,
      createdAt: skillsTable.createdAt,
      description: skillsTable.description,
      id: skillsTable.id,
      latestVersion: skillsTable.latestVersion,
      repoName: reposTable.name,
      slug: skillsTable.slug,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(savedSkillsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, savedSkillsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(savedSkillsTable.userId, input.userId), eq(skillsTable.visibility, "public")))
    .orderBy(desc(savedSkillsTable.createdAt), desc(savedSkillsTable.id))
    .limit(limit);
}
