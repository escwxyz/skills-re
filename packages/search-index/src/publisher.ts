import { pagefindGenerationManifestSchema } from "@skills-re/contract/pagefind";
import type { PagefindGenerationManifest } from "@skills-re/contract/pagefind";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MANIFEST_CACHE_CONTROL = "public, max-age=60";
const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface PublishedGenerationDescriptor extends PagefindGenerationManifest {
  files: string[];
}

export interface PublishFile {
  bytes: Uint8Array;
  contentType: string;
  path: string;
}

export interface SearchIndexObjectStore {
  head: (key: string) => Promise<boolean>;
  put: (
    key: string,
    bytes: Uint8Array,
    metadata: { cacheControl: string; contentType: string },
  ) => Promise<void>;
}

interface PublishGenerationInput {
  files: PublishFile[];
  manifest: PagefindGenerationManifest;
  smokeTest: (manifest: PagefindGenerationManifest) => Promise<void>;
  store: SearchIndexObjectStore;
}

const jsonBytes = (value: unknown) =>
  new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);

const assertSafeRelativePath = (path: string) => {
  if (!path || path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error(`Unsafe Pagefind asset path: ${path}`);
  }
};

export const publishGeneration = async (input: PublishGenerationInput) => {
  const manifest = pagefindGenerationManifestSchema.parse(input.manifest);
  const generationPrefix = `pagefind/generations/${manifest.generationId}`;
  const uploadedKeys: string[] = [];

  for (const file of input.files) {
    assertSafeRelativePath(file.path);
    const key = `${generationPrefix}/pagefind/${file.path}`;
    await input.store.put(key, file.bytes, {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      contentType: file.contentType,
    });
    uploadedKeys.push(key);
  }

  const generationManifestKey = `${generationPrefix}/generation.json`;
  await input.store.put(
    generationManifestKey,
    jsonBytes({ ...manifest, files: input.files.map((file) => file.path) }),
    {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      contentType: "application/json; charset=utf-8",
    },
  );
  uploadedKeys.push(generationManifestKey);

  const remoteChecks = await Promise.all(uploadedKeys.map((key) => input.store.head(key)));
  const missingIndex = remoteChecks.findIndex((exists) => !exists);
  if (missingIndex !== -1) {
    throw new Error(`Remote Pagefind validation failed for ${uploadedKeys[missingIndex]}.`);
  }
  await input.smokeTest(manifest);

  await input.store.put("pagefind/current.json", jsonBytes(manifest), {
    cacheControl: MANIFEST_CACHE_CONTROL,
    contentType: "application/json; charset=utf-8",
  });

  return { generationId: manifest.generationId, uploadedKeys };
};

export const selectExpiredGenerationIds = (
  generations: { generationId: string; publishedAt: number }[],
  input: {
    activeGenerationId: string;
    now: number;
    previousGenerationId: string;
    retentionMs?: number;
  },
) => {
  const protectedIds = new Set([input.activeGenerationId, input.previousGenerationId]);
  const cutoff = input.now - (input.retentionMs ?? DEFAULT_RETENTION_MS);
  return generations
    .filter(
      (generation) => !protectedIds.has(generation.generationId) && generation.publishedAt < cutoff,
    )
    .map((generation) => generation.generationId)
    .toSorted();
};

export const cleanupExpiredGenerations = async (input: {
  deleteKey: (key: string) => Promise<void>;
  descriptors: PublishedGenerationDescriptor[];
  expiredGenerationIds: string[];
}) => {
  const descriptorById = new Map(
    input.descriptors.map((descriptor) => [descriptor.generationId, descriptor] as const),
  );
  for (const generationId of input.expiredGenerationIds) {
    const descriptor = descriptorById.get(generationId);
    if (!descriptor) {
      continue;
    }
    for (const path of descriptor.files) {
      assertSafeRelativePath(path);
      await input.deleteKey(`pagefind/generations/${generationId}/pagefind/${path}`);
    }
    await input.deleteKey(`pagefind/generations/${generationId}/generation.json`);
  }
};

export const createRollbackManifest = (
  retainedManifest: PagefindGenerationManifest,
  publishedAt = Date.now(),
) =>
  pagefindGenerationManifestSchema.parse({
    ...retainedManifest,
    publishedAt,
  });
