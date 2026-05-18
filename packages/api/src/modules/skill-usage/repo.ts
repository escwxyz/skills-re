import { and, desc, eq } from "drizzle-orm";

import { reposTable, skillUsageEventsTable, skillsTable } from "@skills-re/db/schema";
import { asSkillId, asSkillUsageEventId, asUserId, createId } from "@skills-re/db/utils";
import type { SkillId, UserId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export interface InsertSkillUsageEventInput {
  agentName?: string;
  projectContext?: string;
  skillId?: SkillId | null;
  skillPath?: string;
  skillSlug: string;
  taskDescription?: string;
  userId: UserId;
  usedAt?: number;
}

export async function insertSkillUsageEvent(input: InsertSkillUsageEventInput, database = db) {
  const usedAt = input.usedAt ?? Date.now();
  const rows = await database
    .insert(skillUsageEventsTable)
    .values({
      agentName: input.agentName ?? null,
      id: asSkillUsageEventId(createId()),
      projectContext: input.projectContext ?? null,
      skillId: input.skillId ? asSkillId(input.skillId) : null,
      skillPath: input.skillPath ?? null,
      skillSlug: input.skillSlug,
      taskDescription: input.taskDescription ?? null,
      userId: asUserId(input.userId),
      usedAt,
    })
    .returning({
      id: skillUsageEventsTable.id,
      usedAt: skillUsageEventsTable.usedAt,
    });

  const [created] = rows;
  if (!created) {
    throw new Error("Failed to record skill usage.");
  }
  return created;
}

export async function listSkillUsageEventsByUserId(
  input: { limit?: number; userId: UserId },
  database = db,
) {
  const limit = input.limit ?? 20;
  return await database
    .select({
      agentName: skillUsageEventsTable.agentName,
      authorHandle: reposTable.ownerHandle,
      id: skillUsageEventsTable.id,
      projectContext: skillUsageEventsTable.projectContext,
      repoName: reposTable.name,
      skillId: skillUsageEventsTable.skillId,
      skillPath: skillUsageEventsTable.skillPath,
      skillSlug: skillUsageEventsTable.skillSlug,
      taskDescription: skillUsageEventsTable.taskDescription,
      title: skillsTable.title,
      usedAt: skillUsageEventsTable.usedAt,
    })
    .from(skillUsageEventsTable)
    .leftJoin(skillsTable, eq(skillsTable.id, skillUsageEventsTable.skillId))
    .leftJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(skillUsageEventsTable.userId, input.userId)))
    .orderBy(desc(skillUsageEventsTable.usedAt), desc(skillUsageEventsTable.id))
    .limit(limit);
}
