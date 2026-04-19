import { and, desc, eq, sql } from "drizzle-orm";

import { changelogsTable } from "@skills-re/db/schema";
import { asChangelogId, createId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export async function listPublishedChangelogs(limit = 20) {
  return await db
    .select()
    .from(changelogsTable)
    .where(eq(changelogsTable.isPublished, true))
    .orderBy(
      desc(changelogsTable.versionMajor),
      desc(changelogsTable.versionMinor),
      desc(changelogsTable.versionPatch),
      desc(changelogsTable.isStable),
    )
    .limit(limit);
}

export async function listAllChangelogs(limit = 100) {
  return await db
    .select()
    .from(changelogsTable)
    .orderBy(
      desc(changelogsTable.versionMajor),
      desc(changelogsTable.versionMinor),
      desc(changelogsTable.versionPatch),
      desc(changelogsTable.isStable),
    )
    .limit(limit);
}

export async function getChangelogById(id: string) {
  const rows = await db
    .select()
    .from(changelogsTable)
    .where(eq(changelogsTable.id, asChangelogId(id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createChangelog(input: {
  changesJson: string[];
  description: string;
  isPublished: boolean;
  isStable: boolean;
  title: string;
  type: "feature" | "patch" | "major";
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}) {
  const rows = await db
    .insert(changelogsTable)
    .values({
      changesJson: input.changesJson,
      createdAt: Date.now(),
      description: input.description,
      id: createId() as ReturnType<typeof asChangelogId>,
      isPublished: input.isPublished,
      isStable: input.isStable,
      title: input.title,
      type: input.type,
      versionMajor: input.versionMajor,
      versionMinor: input.versionMinor,
      versionPatch: input.versionPatch,
    })
    .returning({
      id: changelogsTable.id,
    });

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create changelog");
  }

  return created.id;
}

export async function updateChangelog(input: {
  changesJson: string[];
  description: string;
  id: string;
  isPublished: boolean;
  isStable: boolean;
  title: string;
  type: "feature" | "patch" | "major";
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}) {
  await db
    .update(changelogsTable)
    .set({
      changesJson: input.changesJson,
      description: input.description,
      isPublished: input.isPublished,
      isStable: input.isStable,
      title: input.title,
      type: input.type,
      versionMajor: input.versionMajor,
      versionMinor: input.versionMinor,
      versionPatch: input.versionPatch,
    })
    .where(eq(changelogsTable.id, asChangelogId(input.id)));
}

export async function deleteChangelog(id: string) {
  await db.delete(changelogsTable).where(eq(changelogsTable.id, asChangelogId(id)));
}

export async function hasVersionTripletConflict(input: {
  excludeId?: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}) {
  const clauses = [
    eq(changelogsTable.versionMajor, input.versionMajor),
    eq(changelogsTable.versionMinor, input.versionMinor),
    eq(changelogsTable.versionPatch, input.versionPatch),
  ];

  if (input.excludeId) {
    clauses.push(sql`${changelogsTable.id} <> ${asChangelogId(input.excludeId)}`);
  }

  const rows = await db
    .select({ id: changelogsTable.id })
    .from(changelogsTable)
    .where(and(...clauses))
    .limit(1);

  return rows.length > 0;
}
