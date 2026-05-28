import { and, eq, inArray } from "drizzle-orm";

import { snapshotFilesTable, snapshotsTable } from "@skills-re/db/schema/snapshots";
import { skillsTable } from "@skills-re/db/schema/skills";
import { asSnapshotId } from "@skills-re/db/utils";
import type { SnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import type { AgentSkillDiscoveryArtifactMetadata, AgentSkillDiscoverySourceRow } from "./service";

const SKILL_ENTRY_FILE_NAMES = new Set(["SKILL.md", "skill.md"]);

const isSkillEntryFile = (path: string) => SKILL_ENTRY_FILE_NAMES.has(path);

const normalizePath = (value: string) =>
  value
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment.length > 0)
    .join("/");

const findEntryFile = <
  T extends {
    path: string;
  },
>(
  files: T[],
  entryPath: string,
  directoryPath: string,
) => {
  const normalizedEntryPath = normalizePath(entryPath);
  const normalizedDirectoryPath = normalizePath(directoryPath);
  const relativeEntryPath =
    normalizedDirectoryPath && normalizedEntryPath.startsWith(`${normalizedDirectoryPath}/`)
      ? normalizedEntryPath.slice(normalizedDirectoryPath.length + 1)
      : normalizedEntryPath;

  return (
    files.find((file) => normalizePath(file.path) === normalizedEntryPath) ??
    files.find((file) => normalizePath(file.path) === relativeEntryPath) ??
    files.find((file) => isSkillEntryFile(normalizePath(file.path)))
  );
};

export const listPublicAgentSkillArtifacts = async (): Promise<AgentSkillDiscoverySourceRow[]> => {
  const snapshots = await db
    .select({
      description: skillsTable.description,
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      latestSnapshotId: skillsTable.latestSnapshotId,
      name: snapshotsTable.name,
      slug: skillsTable.slug,
    })
    .from(skillsTable)
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .where(eq(skillsTable.visibility, "public"))
    .orderBy(skillsTable.slug, skillsTable.id);

  const snapshotIds = snapshots
    .map((snapshot) => snapshot.latestSnapshotId)
    .filter((snapshotId): snapshotId is SnapshotId => snapshotId !== null);
  if (snapshotIds.length === 0) {
    return [];
  }

  const files = await db
    .select({
      fileHash: snapshotFilesTable.fileHash,
      path: snapshotFilesTable.path,
      r2Key: snapshotFilesTable.r2Key,
      snapshotId: snapshotFilesTable.snapshotId,
    })
    .from(snapshotFilesTable)
    .where(inArray(snapshotFilesTable.snapshotId, snapshotIds))
    .orderBy(snapshotFilesTable.snapshotId, snapshotFilesTable.path);

  const filesBySnapshotId = new Map<SnapshotId, typeof files>();
  for (const file of files) {
    const snapshotFiles = filesBySnapshotId.get(file.snapshotId) ?? [];
    snapshotFiles.push(file);
    filesBySnapshotId.set(file.snapshotId, snapshotFiles);
  }

  return snapshots.map((snapshot) => {
    const snapshotFiles = snapshot.latestSnapshotId
      ? (filesBySnapshotId.get(snapshot.latestSnapshotId) ?? [])
      : [];
    const entryFile = findEntryFile(snapshotFiles, snapshot.entryPath, snapshot.directoryPath);

    return {
      description: snapshot.description,
      fileHash: entryFile?.fileHash ?? null,
      latestSnapshotId: snapshot.latestSnapshotId,
      name: snapshot.name,
      r2Key: entryFile?.r2Key ?? null,
      slug: snapshot.slug,
    };
  });
};

export const getAgentSkillArtifactBySnapshotId = async (
  snapshotId: string,
): Promise<AgentSkillDiscoveryArtifactMetadata | null> => {
  const [snapshot] = await db
    .select({
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      snapshotId: snapshotsTable.id,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.latestSnapshotId, snapshotsTable.id))
    .where(
      and(
        eq(snapshotsTable.id, asSnapshotId(snapshotId)),
        eq(skillsTable.visibility, "public"),
        eq(skillsTable.latestSnapshotId, asSnapshotId(snapshotId)),
      ),
    )
    .limit(1);

  if (!snapshot) {
    return null;
  }

  const files = await db
    .select({
      contentType: snapshotFilesTable.contentType,
      fileHash: snapshotFilesTable.fileHash,
      path: snapshotFilesTable.path,
      r2Key: snapshotFilesTable.r2Key,
      size: snapshotFilesTable.size,
    })
    .from(snapshotFilesTable)
    .where(eq(snapshotFilesTable.snapshotId, snapshot.snapshotId as SnapshotId));

  const file = findEntryFile(files, snapshot.entryPath, snapshot.directoryPath);
  if (!(file?.r2Key && file.fileHash)) {
    return null;
  }

  return {
    contentType: file.contentType,
    fileHash: file.fileHash,
    path: file.path,
    r2Key: file.r2Key,
    size: file.size,
    snapshotId: snapshot.snapshotId,
  };
};
