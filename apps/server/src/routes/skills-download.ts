import { z } from "zod/v4";
import type { SnapshotStorageRuntime } from "@skills-re/api/types";

export const snapshotArchiveDownloadInputSchema = z.object({
  snapshotId: z.string().min(1),
});

export interface SkillArchiveDownloadDeps {
  getSnapshotArchiveDownloadObject: (
    input: { snapshotId: string },
    snapshotStorage?: SnapshotStorageRuntime,
  ) => Promise<{
    archiveKey: string;
    object: {
      body?: unknown;
      httpEtag?: string;
      httpMetadata?: {
        contentType?: string;
      };
      size?: number;
    };
    snapshot: {
      archiveR2Key: string | null;
      description: string;
      directoryPath: string;
      entryPath: string;
      hash: string;
      id: string;
      isDeprecated: boolean;
      name: string;
      skillId: string;
      sourceCommitDate: number | null;
      sourceCommitMessage: string | null;
      sourceCommitSha: string | null;
      sourceCommitUrl: string | null;
      syncTime: number;
      version: string;
    };
  } | null>;
  snapshotStorage?: SnapshotStorageRuntime;
  recordSuccessfulSkillDownload: (input: { skillId: string; version: string }) => Promise<void>;
}

const defaultDeps: SkillArchiveDownloadDeps = {
  getSnapshotArchiveDownloadObject: async (input, snapshotStorage) => {
    const { getSnapshotArchiveDownloadObject } = await import("@skills-re/api/modules");
    return await getSnapshotArchiveDownloadObject(input, snapshotStorage);
  },
  // oxlint-disable-next-line no-empty-function
  recordSuccessfulSkillDownload: async () => {},
};

const sanitizeFileName = (value: string) =>
  value
    .replaceAll(/[^a-z0-9-_]+/gi, "-")
    .replaceAll(/^-+|-+$/g, "")
    .toLowerCase();

export const createSkillArchiveDownloadResponse = async (
  input: z.input<typeof snapshotArchiveDownloadInputSchema>,
  deps: Partial<SkillArchiveDownloadDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };
  const parsed = snapshotArchiveDownloadInputSchema.safeParse(input);
  if (!parsed.success) {
    return new Response("Invalid download params.", { status: 400 });
  }

  const archive = await activeDeps.getSnapshotArchiveDownloadObject(
    {
      snapshotId: parsed.data.snapshotId,
    },
    activeDeps.snapshotStorage,
  );
  if (!archive) {
    return new Response("Snapshot archive not found.", { status: 404 });
  }

  const baseName = sanitizeFileName(archive.snapshot.name || "skill");
  const fileName = `${baseName}-v${archive.snapshot.version}.tar.gz`;
  const contentType = archive.object.httpMetadata?.contentType ?? "application/gzip";

  await activeDeps.recordSuccessfulSkillDownload({
    skillId: archive.snapshot.skillId,
    version: archive.snapshot.version,
  });

  return new Response(archive.object.body as never, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": contentType,
      ...(archive.object.httpEtag ? { ETag: archive.object.httpEtag } : {}),
    },
  });
};
