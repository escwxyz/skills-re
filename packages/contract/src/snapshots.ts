import { z } from "zod";

import { baseContract } from "./common/base";
import {
  fileContentSchema,
  snapshotCreateHistoricalSnapshotsInputSchema,
  snapshotFileManifestEntrySchema,
  snapshotFileSignedUrlSchema,
  snapshotItemSchema,
  snapshotTreeEntrySchema,
} from "./common/snapshots";
import { idSchema } from "./common/ids";

const snapshotListInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  skillId: idSchema,
});

const snapshotBySkillAndVersionInputSchema = z.object({
  skillId: idSchema,
  version: z.string().min(1),
});

const snapshotDownloadManifestInputSchema = z.object({
  snapshotId: idSchema,
});

const snapshotFileSignedUrlInputSchema = z.object({
  expiresIn: z.number().int().min(1).optional(),
  path: z.string().min(1),
  snapshotId: idSchema,
});

const snapshotFileContentInputSchema = z.object({
  maxBytes: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  path: z.string().min(1),
  snapshotId: idSchema,
});

const snapshotTreeEntriesInputSchema = z.object({
  snapshotId: idSchema,
});

const snapshotUploadFilesInputSchema = z.object({
  files: z.array(fileContentSchema).min(1),
  snapshotId: idSchema,
});

const snapshotListResultSchema = z.object({
  continueCursor: z.string(),
  isDone: z.boolean(),
  page: z.array(snapshotItemSchema),
});

const snapshotFileContentResultSchema = z.object({
  bytesRead: z.number().int().nonnegative(),
  content: z.string(),
  isTruncated: z.boolean(),
  offset: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
});

const snapshotFileSignedUrlResultSchema = snapshotFileSignedUrlSchema.nullable();

const createHistoricalSnapshotsResultSchema = z.null();

const listBySkillContract = baseContract
  .route({
    description: "Returns the snapshot history for a skill, ordered from newest to oldest.",
    method: "GET",
    path: "/snapshots",
    tags: ["Snapshots"],
    successDescription: "Skill snapshot history",
    summary: "List snapshots by skill",
  })
  .input(snapshotListInputSchema)
  .output(snapshotListResultSchema);

const getBySkillAndVersionContract = baseContract
  .route({
    description: "Returns the latest non-deprecated snapshot for a skill and version.",
    method: "GET",
    path: "/snapshots/by-skill-and-version",
    tags: ["Snapshots"],
    successDescription: "Snapshot detail",
    summary: "Read a snapshot by skill and version",
  })
  .input(snapshotBySkillAndVersionInputSchema)
  .output(snapshotItemSchema.nullable());

const uploadSnapshotFilesContract = baseContract
  .route({
    description: "Uploads a snapshot payload to the storage workflow.",
    method: "POST",
    path: "/snapshots/upload-files",
    tags: ["Snapshots"],
    successDescription: "Snapshot upload queued",
    summary: "Upload snapshot files",
  })
  .input(snapshotUploadFilesInputSchema)
  .output(z.object({ workId: z.string() }));

const getSnapshotDownloadManifestContract = baseContract
  .route({
    description: "Returns the downloadable file manifest for a snapshot archive.",
    method: "GET",
    path: "/snapshots/download-manifest",
    tags: ["Snapshots"],
    successDescription: "Snapshot download manifest",
    summary: "Read a snapshot download manifest",
  })
  .input(snapshotDownloadManifestInputSchema)
  .output(z.array(snapshotFileManifestEntrySchema));

const getSnapshotFileSignedUrlContract = baseContract
  .route({
    description: "Returns a signed URL for a snapshot file when the object is available.",
    method: "GET",
    path: "/snapshots/file-signed-url",
    tags: ["Snapshots"],
    successDescription: "Snapshot file signed URL",
    summary: "Read a snapshot file signed URL",
  })
  .input(snapshotFileSignedUrlInputSchema)
  .output(snapshotFileSignedUrlResultSchema);

const readSnapshotFileContentContract = baseContract
  .route({
    description: "Returns the raw contents of a snapshot file, optionally paged by byte offset.",
    method: "GET",
    path: "/snapshots/file-content",
    tags: ["Snapshots"],
    successDescription: "Snapshot file content",
    summary: "Read snapshot file content",
  })
  .input(snapshotFileContentInputSchema)
  .output(snapshotFileContentResultSchema);

const getSnapshotTreeEntriesContract = baseContract
  .route({
    description: "Returns the tree view for the snapshot entry path.",
    method: "GET",
    path: "/snapshots/tree",
    tags: ["Snapshots"],
    successDescription: "Snapshot tree entries",
    summary: "Read snapshot tree entries",
  })
  .input(snapshotTreeEntriesInputSchema)
  .output(z.array(snapshotTreeEntrySchema));

const createHistoricalSnapshotsContract = baseContract
  .route({
    description: "Creates historical snapshots for older commits of a repository.",
    method: "POST",
    path: "/snapshots/historical",
    tags: ["Snapshots"],
    successDescription: "Historical snapshots created",
    summary: "Create historical snapshots",
  })
  .input(snapshotCreateHistoricalSnapshotsInputSchema)
  .output(createHistoricalSnapshotsResultSchema);

export const snapshotsContract = {
  createHistoricalSnapshots: createHistoricalSnapshotsContract,
  getBySkillAndVersion: getBySkillAndVersionContract,
  getSnapshotDownloadManifest: getSnapshotDownloadManifestContract,
  getSnapshotFileSignedUrl: getSnapshotFileSignedUrlContract,
  getSnapshotTreeEntries: getSnapshotTreeEntriesContract,
  listBySkill: listBySkillContract,
  readSnapshotFileContent: readSnapshotFileContentContract,
  uploadSnapshotFiles: uploadSnapshotFilesContract,
} as const;
