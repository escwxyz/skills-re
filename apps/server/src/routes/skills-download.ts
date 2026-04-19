import { z } from "zod";

export const snapshotArchiveDownloadInputSchema = z.object({
  format: z.literal("tar.gz").optional(),
  skillId: z.string().min(1),
  version: z.string().min(1),
});

export interface SkillArchiveDownloadDeps {
  getBySkillAndVersion: (input: { skillId: string; version: string }) => Promise<{
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
  } | null>;
  getSnapshotArchiveDownloadObject: (input: { snapshotId: string }) => Promise<{
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
  recordSuccessfulSkillDownload: (input: { skillId: string; version: string }) => Promise<void>;
}

const defaultDeps: SkillArchiveDownloadDeps = {
  getBySkillAndVersion: async (input) => {
    const { getBySkillAndVersion } = await import("@skills-re/api/modules");
    return await getBySkillAndVersion(input);
  },
  getSnapshotArchiveDownloadObject: async (input) => {
    const { getSnapshotArchiveDownloadObject } = await import("@skills-re/api/modules");
    return await getSnapshotArchiveDownloadObject(input);
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
  const parsed = snapshotArchiveDownloadInputSchema.parse(input);
  const snapshot = await activeDeps.getBySkillAndVersion({
    skillId: parsed.skillId,
    version: parsed.version,
  });

  if (!snapshot) {
    return new Response("Snapshot not found.", { status: 404 });
  }

  const archive = await activeDeps.getSnapshotArchiveDownloadObject({
    snapshotId: snapshot.id,
  });
  if (!archive) {
    return new Response("Snapshot archive not found.", { status: 404 });
  }

  const baseName = sanitizeFileName(archive.snapshot.name || "skill");
  const fileName = `${baseName}-v${archive.snapshot.version}.tar.gz`;
  const contentType = archive.object.httpMetadata?.contentType ?? "application/gzip";

  await activeDeps.recordSuccessfulSkillDownload({
    skillId: parsed.skillId,
    version: parsed.version,
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
