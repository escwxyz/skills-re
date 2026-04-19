import { eq } from "drizzle-orm";

import { asRepoId } from "@skills-re/db/utils";
import { reposTable } from "@skills-re/db/schema/repos";

import { db } from "../shared/db";

export async function findRepoByNameWithOwner(nameWithOwner: string) {
  const rows = await db
    .select()
    .from(reposTable)
    .where(eq(reposTable.nameWithOwner, nameWithOwner))
    .limit(1);

  return rows[0] ?? null;
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

  const existing = rows[0];
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

  return rows[0] ?? null;
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

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create repository record");
  }

  return created.id;
}
