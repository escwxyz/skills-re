import { and, asc, desc, eq, sql } from "drizzle-orm";

import { asRepoId } from "@skills-re/db/utils";
import { skillsTable } from "@skills-re/db/schema/skills";
import { reposTable } from "@skills-re/db/schema/repos";

import { db } from "../shared/db";
import { defaultLimit } from "../shared/pagination";
import { decodeRepoCursor, encodeRepoCursor } from "./cursor";

export async function findRepoByNameWithOwner(nameWithOwner: string) {
  const rows = await db
    .select()
    .from(reposTable)
    .where(eq(reposTable.nameWithOwner, nameWithOwner))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    ...row,
    updatedAt: row.updatedAt,
  };
}

export async function updateRepoStatsByNameWithOwner(input: {
  forks: number;
  nameWithOwner: string;
  stars: number;
  updatedAt: number;
}) {
  const rows = await db
    .select({
      id: reposTable.id,
      updatedAt: reposTable.updatedAt,
    })
    .from(reposTable)
    .where(eq(reposTable.nameWithOwner, input.nameWithOwner))
    .limit(1);

  const [existing] = rows;
  if (!existing) {
    return { changed: false };
  }

  const changed = existing.updatedAt !== input.updatedAt;

  await db
    .update(reposTable)
    .set({
      forks: input.forks,
      stars: input.stars,
      syncTime: Date.now(),
      updatedAt: input.updatedAt,
    })
    .where(eq(reposTable.id, existing.id));

  return { changed };
}

export async function findRepoById(id: string) {
  const rows = await db
    .select({
      forks: reposTable.forks,
      id: reposTable.id,
      name: reposTable.name,
      nameWithOwner: reposTable.nameWithOwner,
      ownerAvatarUrl: reposTable.ownerAvatarUrl,
      ownerHandle: reposTable.ownerHandle,
      ownerName: reposTable.ownerName,
      stars: reposTable.stars,
      updatedAt: reposTable.updatedAt,
    })
    .from(reposTable)
    .where(eq(reposTable.id, asRepoId(id)))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    ...row,
    updatedAt: row.updatedAt,
  };
}

export async function listReposByOwner(input: {
  ownerHandle: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = input.limit ?? defaultLimit;
  const cursor = decodeRepoCursor(input.cursor);
  const skillCountExpr = sql<number>`count(distinct ${skillsTable.id})`;

  const rows = await db
    .select({
      id: reposTable.id,
      nameWithOwner: reposTable.nameWithOwner,
      ownerHandle: reposTable.ownerHandle,
      repoName: reposTable.name,
      skillCount: skillCountExpr,
      syncTime: reposTable.syncTime,
    })
    .from(reposTable)
    .innerJoin(skillsTable, eq(skillsTable.repoId, reposTable.id))
    .where(
      and(
        eq(reposTable.ownerHandle, input.ownerHandle),
        eq(skillsTable.visibility, "public"),
        cursor
          ? sql`(${reposTable.syncTime}, ${reposTable.id}) < (${cursor.syncTime}, ${cursor.id})`
          : sql`1 = 1`,
      ),
    )
    .groupBy(
      reposTable.id,
      reposTable.nameWithOwner,
      reposTable.ownerHandle,
      reposTable.name,
      reposTable.syncTime,
    )
    .orderBy(
      desc(skillCountExpr),
      desc(reposTable.syncTime),
      asc(reposTable.name),
      asc(reposTable.id),
    )
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;

  return {
    continueCursor: encodeRepoCursor(
      rows.length > limit && next
        ? {
            id: next.id,
            syncTime: next.syncTime,
          }
        : null,
    ),
    isDone: rows.length <= limit,
    repos: page.map((row) => ({
      nameWithOwner: row.nameWithOwner,
      repoName: row.repoName,
      repoOwner: row.ownerHandle,
      skillCount: row.skillCount,
    })),
  };
}

export async function createRepo(input: {
  createdAt: number;
  defaultBranch: string;
  forks: number;
  license?: string | null;
  name: string;
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  ownerHandle: string;
  ownerName?: string | null;
  stars: number;
  syncTime: number;
  updatedAt: number;
  url: string;
}) {
  const rows = await db
    .insert(reposTable)
    .values({
      createdAt: new Date(input.createdAt),
      defaultBranch: input.defaultBranch,
      forks: input.forks,
      license: input.license ?? null,
      name: input.name,
      nameWithOwner: input.nameWithOwner,
      ownerAvatarUrl: input.ownerAvatarUrl ?? null,
      ownerHandle: input.ownerHandle,
      ownerName: input.ownerName ?? null,
      stars: input.stars,
      syncTime: input.syncTime,
      updatedAt: input.updatedAt,
      url: input.url,
    })
    .returning({
      id: reposTable.id,
    });

  const [created] = rows;
  if (!created) {
    throw new Error("Failed to create repository record");
  }

  return created.id;
}
