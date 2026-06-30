import { and, asc, eq, exists, gt, inArray, isNotNull, or, sql } from "drizzle-orm";

import { reposTable } from "@skills-re/db/schema/repos";
import { skillsTable, skillsTagsTable } from "@skills-re/db/schema/skills";
import { snapshotFilesTable, snapshotsTable } from "@skills-re/db/schema/snapshots";
import { tagsTable } from "@skills-re/db/schema/tags";
import type { SkillId, SnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";

const DEFAULT_EXPORT_LIMIT = 50;

interface ExportCursor {
  id: string;
  updatedAt: number;
}

export interface PagefindExportSourceRow {
  authorHandle: string;
  description: string;
  fileHash: string;
  id: string;
  isVerified: boolean;
  primaryCategory: string | null;
  repoName: string;
  slug: string;
  snapshotId: string;
  tags: string[];
  title: string;
  updatedAt: number;
}

export const encodePagefindExportCursor = (cursor: ExportCursor | null) =>
  cursor
    ? btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
    : "";

export const decodePagefindExportCursor = (value?: string): ExportCursor | null => {
  if (!value) {
    return null;
  }

  try {
    const normalized = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as { id?: unknown; updatedAt?: unknown };
    if (
      typeof parsed.id === "string" &&
      parsed.id.length > 0 &&
      typeof parsed.updatedAt === "number" &&
      Number.isInteger(parsed.updatedAt) &&
      parsed.updatedAt >= 0
    ) {
      return { id: parsed.id, updatedAt: parsed.updatedAt };
    }
  } catch {
    return null;
  }

  return null;
};

const parsePagefindExportCursor = (value?: string) => {
  const cursor = decodePagefindExportCursor(value);
  if (value && !cursor) {
    throw new Error("Invalid Pagefind export cursor.");
  }
  return cursor;
};

const normalizePath = (value: string) =>
  value.replaceAll("\\", "/").split("/").filter(Boolean).join("/");

export const selectPagefindEntryFile = <T extends { path: string }>(
  files: T[],
  entryPath: string,
  directoryPath: string,
) => {
  const normalizedEntryPath = normalizePath(entryPath);
  const normalizedDirectoryPath = normalizePath(directoryPath);
  const directoryEntryPath =
    normalizedDirectoryPath && !normalizedEntryPath.includes("/")
      ? `${normalizedDirectoryPath}/${normalizedEntryPath}`
      : undefined;
  const relativeEntryPath =
    normalizedDirectoryPath && normalizedEntryPath.startsWith(`${normalizedDirectoryPath}/`)
      ? normalizedEntryPath.slice(normalizedDirectoryPath.length + 1)
      : normalizedEntryPath;

  return (
    files.find((file) => normalizePath(file.path) === directoryEntryPath) ??
    files.find((file) => normalizePath(file.path) === normalizedEntryPath) ??
    files.find((file) => normalizePath(file.path) === relativeEntryPath) ??
    files.find((file) => ["SKILL.md", "skill.md"].includes(normalizePath(file.path)))
  );
};

export const listPagefindExportRows = async (input: { cursor?: string; limit?: number }) => {
  const limit = input.limit ?? DEFAULT_EXPORT_LIMIT;
  const cursor = parsePagefindExportCursor(input.cursor);

  const hasFetchableEntry = exists(
    db
      .select({ value: sql`1` })
      .from(snapshotFilesTable)
      .where(
        and(
          eq(snapshotFilesTable.snapshotId, skillsTable.latestSnapshotId),
          isNotNull(snapshotFilesTable.r2Key),
          sql`(lower(${snapshotFilesTable.path}) = 'skill.md' or lower(${snapshotFilesTable.path}) like '%/skill.md')`,
        ),
      ),
  );
  const cursorCondition = cursor
    ? or(
        gt(skillsTable.updatedAt, cursor.updatedAt),
        and(eq(skillsTable.updatedAt, cursor.updatedAt), gt(skillsTable.id, cursor.id as SkillId)),
      )
    : undefined;

  const sourceRows = await db
    .select({
      authorHandle: reposTable.ownerHandle,
      description: skillsTable.description,
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      id: skillsTable.id,
      isVerified: skillsTable.isVerified,
      primaryCategory: skillsTable.primaryCategory,
      repoName: reposTable.name,
      slug: skillsTable.slug,
      snapshotId: snapshotsTable.id,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .where(and(eq(skillsTable.visibility, "public"), hasFetchableEntry, cursorCondition))
    .orderBy(asc(skillsTable.updatedAt), asc(skillsTable.id))
    .limit(limit + 1);

  const pageSources = sourceRows.slice(0, limit);
  const snapshotIds = pageSources.map((row) => row.snapshotId as SnapshotId);
  const skillIds = pageSources.map((row) => row.id as SkillId);
  const [files, tagRows, watermarkRows] = await Promise.all([
    snapshotIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            fileHash: snapshotFilesTable.fileHash,
            path: snapshotFilesTable.path,
            r2Key: snapshotFilesTable.r2Key,
            snapshotId: snapshotFilesTable.snapshotId,
          })
          .from(snapshotFilesTable)
          .where(
            and(
              inArray(snapshotFilesTable.snapshotId, snapshotIds),
              isNotNull(snapshotFilesTable.r2Key),
            ),
          ),
    skillIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ skillId: skillsTagsTable.skillId, tag: tagsTable.slug })
          .from(skillsTagsTable)
          .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
          .where(inArray(skillsTagsTable.skillId, skillIds))
          .orderBy(asc(skillsTagsTable.skillId), asc(tagsTable.slug)),
    db
      .select({ value: sql<number>`coalesce(max(${skillsTable.updatedAt}), 0)` })
      .from(skillsTable)
      .where(eq(skillsTable.visibility, "public")),
  ]);

  const filesBySnapshot = new Map<string, typeof files>();
  for (const file of files) {
    const current = filesBySnapshot.get(file.snapshotId) ?? [];
    current.push(file);
    filesBySnapshot.set(file.snapshotId, current);
  }
  const tagsBySkill = new Map<string, string[]>();
  for (const tagRow of tagRows) {
    const current = tagsBySkill.get(tagRow.skillId) ?? [];
    current.push(tagRow.tag);
    tagsBySkill.set(tagRow.skillId, current);
  }

  const page: PagefindExportSourceRow[] = [];
  for (const row of pageSources) {
    const file = selectPagefindEntryFile(
      filesBySnapshot.get(row.snapshotId) ?? [],
      row.entryPath,
      row.directoryPath,
    );
    if (!(file?.r2Key && file.fileHash)) {
      continue;
    }
    page.push({
      authorHandle: row.authorHandle,
      description: row.description,
      fileHash: file.fileHash,
      id: row.id,
      isVerified: row.isVerified,
      primaryCategory: row.primaryCategory,
      repoName: row.repoName,
      slug: row.slug,
      snapshotId: row.snapshotId,
      tags: tagsBySkill.get(row.id) ?? [],
      title: row.title,
      updatedAt: row.updatedAt,
    });
  }

  const last = pageSources.at(-1);
  return {
    continueCursor: encodePagefindExportCursor(
      sourceRows.length > limit && last ? { id: last.id, updatedAt: last.updatedAt } : null,
    ),
    isDone: sourceRows.length <= limit,
    page,
    sourceWatermark: watermarkRows[0]?.value ?? 0,
  };
};
