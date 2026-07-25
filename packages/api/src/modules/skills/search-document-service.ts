import { and, eq, sql } from "drizzle-orm";

import { skillSearchDocumentsTable } from "@skills-re/db/schema";
import { reposTable } from "@skills-re/db/schema/repos";
import { skillsTable, skillsTagsTable } from "@skills-re/db/schema/skills";
import { tagsTable } from "@skills-re/db/schema/tags";
import { asSkillId } from "@skills-re/db/utils";
import type { SkillId, SnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export const SKILL_SEARCH_MAX_INDEXED_BODY_BYTES = 524_288;

export interface ReplaceSkillSearchDocumentInput {
  authorHandle: string;
  body: string;
  contentHash: string;
  description: string;
  isPublic: boolean;
  maxIndexedBodyBytes?: number;
  repository: string;
  skillId: SkillId;
  slug: string;
  snapshotId: SnapshotId;
  tags?: string[];
  title: string;
  updatedAt?: number;
}

interface SearchDocumentServiceDb {
  delete: typeof db.delete;
  insert: typeof db.insert;
  select: typeof db.select;
  update: typeof db.update;
}

const defaultSearchDocumentDb = db as SearchDocumentServiceDb;

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

const truncateUtf8 = (value: string, maxBytes: number) => {
  if (utf8ByteLength(value) <= maxBytes) {
    return value;
  }

  let output = "";
  let outputBytes = 0;
  for (const char of value) {
    const charBytes = utf8ByteLength(char);
    if (outputBytes + charBytes > maxBytes) {
      break;
    }
    output += char;
    outputBytes += charBytes;
  }
  return output;
};

export const prepareSkillSearchDocument = (input: ReplaceSkillSearchDocumentInput) => {
  const maxIndexedBodyBytes = input.maxIndexedBodyBytes ?? SKILL_SEARCH_MAX_INDEXED_BODY_BYTES;
  if (!Number.isInteger(maxIndexedBodyBytes) || maxIndexedBodyBytes <= 0) {
    throw new Error("Maximum indexed body size must be a positive integer.");
  }

  const bodySizeBytes = utf8ByteLength(input.body);
  const body = truncateUtf8(input.body, maxIndexedBodyBytes);

  return {
    authorHandle: input.authorHandle,
    body,
    bodySizeBytes,
    contentHash: input.contentHash,
    description: input.description,
    indexingStatus: bodySizeBytes > maxIndexedBodyBytes ? "truncated" : "indexed",
    maxIndexedBodyBytes,
    repository: input.repository,
    skillId: input.skillId,
    slug: input.slug,
    snapshotId: input.snapshotId,
    tags: (input.tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(" "),
    title: input.title,
    updatedAt: input.updatedAt ?? Date.now(),
  } as const;
};

export const deleteSkillSearchDocument = async (
  skillId: SkillId,
  database: SearchDocumentServiceDb = defaultSearchDocumentDb,
) => {
  await database
    .delete(skillSearchDocumentsTable)
    .where(eq(skillSearchDocumentsTable.skillId, skillId));
};

export const replaceSkillSearchDocument = async (
  input: ReplaceSkillSearchDocumentInput,
  database: SearchDocumentServiceDb = defaultSearchDocumentDb,
) => {
  if (!input.isPublic) {
    await deleteSkillSearchDocument(input.skillId, database);
    return { status: "deleted" as const };
  }

  const [skill] = await database
    .select({
      latestSnapshotId: skillsTable.latestSnapshotId,
      visibility: skillsTable.visibility,
    })
    .from(skillsTable)
    .where(eq(skillsTable.id, input.skillId))
    .limit(1);

  if (!skill || skill.visibility !== "public") {
    await deleteSkillSearchDocument(input.skillId, database);
    return { status: "deleted" as const };
  }

  if (skill.latestSnapshotId !== input.snapshotId) {
    return { status: "skipped-stale" as const };
  }

  const document = prepareSkillSearchDocument(input);
  await database.insert(skillSearchDocumentsTable).values(document).onConflictDoUpdate({
    set: document,
    target: skillSearchDocumentsTable.skillId,
  });

  return {
    indexingStatus: document.indexingStatus,
    status: "replaced" as const,
  };
};

export const refreshSkillSearchDocumentMetadata = async (
  skillId: SkillId,
  database: SearchDocumentServiceDb = defaultSearchDocumentDb,
) => {
  const [skill] = await database
    .select({
      authorHandle: reposTable.ownerHandle,
      description: skillsTable.description,
      latestSnapshotId: skillsTable.latestSnapshotId,
      repository: reposTable.name,
      slug: skillsTable.slug,
      tags: sql<string>`coalesce(group_concat(distinct ${tagsTable.slug}), '')`,
      title: skillsTable.title,
      visibility: skillsTable.visibility,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .leftJoin(skillsTagsTable, eq(skillsTagsTable.skillId, skillsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(eq(skillsTable.id, skillId))
    .groupBy(skillsTable.id)
    .limit(1);

  if (!skill || skill.visibility !== "public" || !skill.latestSnapshotId) {
    await deleteSkillSearchDocument(skillId, database);
    return { status: "deleted" as const };
  }

  await database
    .update(skillSearchDocumentsTable)
    .set({
      authorHandle: skill.authorHandle,
      description: skill.description,
      repository: skill.repository,
      slug: skill.slug,
      tags: skill.tags.split(",").filter(Boolean).join(" "),
      title: skill.title,
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(skillSearchDocumentsTable.skillId, skillId),
        eq(skillSearchDocumentsTable.snapshotId, skill.latestSnapshotId),
      ),
    );

  return { status: "refreshed" as const };
};

export const refreshRepoSkillSearchDocumentMetadata = async (
  nameWithOwner: string,
  database: SearchDocumentServiceDb = defaultSearchDocumentDb,
) => {
  const rows = await database
    .select({
      skillId: skillsTable.id,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(reposTable.nameWithOwner, nameWithOwner), eq(skillsTable.visibility, "public")));

  let refreshedCount = 0;
  let deletedCount = 0;
  for (const row of rows) {
    const result = await refreshSkillSearchDocumentMetadata(asSkillId(row.skillId), database);
    if (result.status === "refreshed") {
      refreshedCount += 1;
    } else {
      deletedCount += 1;
    }
  }

  return {
    deletedCount,
    refreshedCount,
  };
};
