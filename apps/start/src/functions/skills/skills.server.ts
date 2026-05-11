import { createServerORPCClient } from "@/lib/orpc.server";
import { diffLines } from "diff";

interface SnapshotRecord {
  description: string;
  entryPath: string;
  hash: string;
  id: string;
  sourceCommitDate?: number | null;
  sourceCommitMessage?: string | null;
  syncTime: number;
  version: string;
}

export const resolveSnapshot = (snapshots: SnapshotRecord[], snapshotId?: string | null) => {
  if (!snapshotId) {
    return snapshots[0] ?? null;
  }

  return (
    snapshots.find((snapshot) => snapshot.id === snapshotId) ??
    snapshots.find((snapshot) => snapshot.version === snapshotId) ??
    snapshots[0] ??
    null
  );
};

// Shared helper — resolves slug to the minimal skill fields needed by subroutes.
// Costs 2 ORPC calls (resolvePathBySlug + getByPath) but keeps subroutes independent.
export const resolveSkillBase = async (slug: string) => {
  const client = createServerORPCClient();
  const path = await client.skills.resolvePathBySlug({ slug });
  if (!path?.authorHandle) {
    return null;
  }
  const skill = await client.skills.getByPath({
    authorHandle: path.authorHandle,
    repoName: path.repoName,
    skillSlug: path.skillSlug,
  });
  if (!skill) {
    return null;
  }
  return {
    description: skill.description,
    id: skill.id,
    latestVersion: skill.latestVersion ?? null,
    title: skill.title,
  };
};

export const buildSnapshotLineDiff = (leftContent: string, rightContent: string) => {
  const changes = diffLines(leftContent, rightContent);
  const lines: {
    kind: "added" | "context" | "removed";
    leftLineNumber?: number;
    rightLineNumber?: number;
    text: string;
  }[] = [];
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let added = 0;
  let removed = 0;
  let context = 0;

  for (const change of changes) {
    let kind: "added" | "removed" | "context";
    if (change.added) {
      kind = "added";
    } else if (change.removed) {
      kind = "removed";
    } else {
      kind = "context";
    }
    const chunkLines = change.value.replace(/\n$/, "").split("\n");

    for (const text of chunkLines) {
      if (kind === "added") {
        lines.push({ kind, rightLineNumber, text });
        added += 1;
        rightLineNumber += 1;
      } else if (kind === "removed") {
        lines.push({ kind, leftLineNumber, text });
        removed += 1;
        leftLineNumber += 1;
      } else {
        lines.push({ kind, leftLineNumber, rightLineNumber, text });
        context += 1;
        leftLineNumber += 1;
        rightLineNumber += 1;
      }
    }
  }

  return {
    lines,
    summary: { added, context, removed },
  };
};
