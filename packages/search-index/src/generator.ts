import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  pagefindExportPageSchema,
  pagefindGenerationManifestSchema,
} from "@skills-re/contract/pagefind";
import type {
  PagefindExportPage,
  PagefindExportRecord,
  PagefindGenerationManifest,
} from "@skills-re/contract/pagefind";

import {
  assertUniqueRecords,
  collectExportRecords,
  createGenerationId,
  fetchArtifacts,
  verifyArtifactDigest,
} from "./core";

export const PAGEFIND_INCLUDE_CHARACTERS = "+.#@_-";
const PAGEFIND_FETCH_TIMEOUT_MS = 30_000;
export const PAGEFIND_META_WEIGHTS = {
  author: 3,
  description: 2,
  repository: 3,
  title: 8,
} as const;

interface PagefindIndex {
  addCustomRecord: (record: {
    content: string;
    filters: Record<string, string[]>;
    language: string;
    meta: Record<string, string>;
    sort: Record<string, string>;
    url: string;
  }) => Promise<{ errors?: string[] }>;
  writeFiles: (input: { outputPath: string }) => Promise<{ errors?: string[] }>;
}

interface PagefindModule {
  close: () => Promise<unknown>;
  createIndex: (config: {
    includeCharacters: string;
    verbose: boolean;
  }) => Promise<{ errors?: string[]; index?: PagefindIndex }>;
}

interface GenerateOptions {
  assetOrigin: string;
  artifactConcurrency?: number;
  automationToken: string;
  fetchImpl?: typeof fetch;
  outputPath: string;
  pagefindModule?: PagefindModule;
  serverOrigin: string;
}

export interface GenerationSummary {
  bundleBytes: number;
  bundleUrl: string;
  durationMs: number;
  generationId: string;
  manifestPath: string;
  outputPath: string;
  recordCount: number;
  shardCount: number;
  sourceWatermark: number;
}

const hasHanCharacters = /[\u3400-\u9FFF]/u;
const hasJapaneseCharacters = /[\u3040-\u30FF]/u;

export const detectRecordLanguage = (content: string) => {
  if (hasJapaneseCharacters.test(content)) {
    return "ja";
  }
  if (hasHanCharacters.test(content)) {
    return "zh";
  }
  return "en";
};

export const addRecordsToPagefind = async (
  records: PagefindExportRecord[],
  artifacts: { bytes: Uint8Array; record: PagefindExportRecord }[],
  index: Pick<PagefindIndex, "addCustomRecord">,
) => {
  const artifactBySkillId = new Map(
    artifacts.map((artifact) => [artifact.record.skillId, artifact] as const),
  );
  for (const record of records) {
    const artifact = artifactBySkillId.get(record.skillId);
    if (!artifact) {
      throw new Error(`Missing fetched artifact for ${record.skillId}.`);
    }
    const content = new TextDecoder().decode(artifact.bytes);
    const result = await index.addCustomRecord({
      content,
      filters: {
        author: [record.authorHandle],
        category: record.primaryCategory ? [record.primaryCategory] : [],
        tags: record.tags.toSorted(),
        verified: [String(record.isVerified)],
      },
      language: detectRecordLanguage(content),
      meta: {
        author: record.authorHandle,
        description: record.description,
        repository: record.repoName,
        skillId: record.skillId,
        snapshotId: record.snapshotId,
        title: record.title,
      },
      sort: { updatedAt: String(record.updatedAt) },
      url: record.canonicalUrl,
    });
    if (result.errors?.length) {
      throw new Error(`Pagefind failed to index ${record.skillId}: ${result.errors.join("; ")}`);
    }
  }
};

const fetchExportPage = async (
  serverOrigin: string,
  automationToken: string,
  fetchImpl: typeof fetch,
  cursor?: string,
): Promise<PagefindExportPage> => {
  const url = new URL("/skills/pagefind/export", serverOrigin);
  url.searchParams.set("limit", "100");
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }
  const response = await fetchImpl(url, {
    headers: { "x-skills-automation-token": automationToken },
    signal: AbortSignal.timeout(PAGEFIND_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Pagefind export failed with HTTP ${response.status}.`);
  }
  return pagefindExportPageSchema.parse(await response.json());
};

const getDirectoryStats = async (path: string) => {
  let bytes = 0;
  let shardCount = 0;
  const visit = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else {
        const fileStats = await stat(entryPath);
        bytes += fileStats.size;
        if (entry.name.endsWith(".pf_index") || entry.name.endsWith(".pf_meta")) {
          shardCount += 1;
        }
      }
    }
  };
  await visit(path);
  return { bytes, shardCount };
};

const listRelativeFiles = async (root: string) => {
  const files: string[] = [];
  const visit = async (directory: string, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(entryPath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  };
  await visit(root);
  return files.toSorted();
};

export const validatePagefindBundle = async (outputPath: string, recordCount: number) => {
  const files = await listRelativeFiles(outputPath);
  const requiredFiles = ["pagefind-entry.json", "pagefind-worker.js", "pagefind.js"];
  for (const requiredFile of requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`Pagefind bundle is missing ${requiredFile}.`);
    }
  }
  if (!files.some((file) => file.endsWith(".pf_index"))) {
    throw new Error("Pagefind bundle contains no index shards.");
  }
  if (!files.some((file) => file.startsWith("wasm.") && file.endsWith(".pagefind"))) {
    throw new Error("Pagefind bundle contains no WebAssembly runtime.");
  }
  JSON.parse(await readFile(join(outputPath, "pagefind-entry.json"), "utf-8"));
  const stats = await getDirectoryStats(outputPath);
  if (stats.bytes <= 0) {
    throw new Error("Pagefind bundle is empty.");
  }
  return {
    bundleBytes: stats.bytes,
    files,
    recordCount,
    shardCount: stats.shardCount,
  };
};

export const generatePagefindBundle = async (
  options: GenerateOptions,
): Promise<GenerationSummary> => {
  const startedAt = Date.now();
  const fetchImpl = options.fetchImpl ?? fetch;
  const { records, sourceWatermark } = await collectExportRecords((cursor) =>
    fetchExportPage(options.serverOrigin, options.automationToken, fetchImpl, cursor),
  );
  assertUniqueRecords(records);
  const generationId = await createGenerationId(
    sourceWatermark,
    records.map((record) => `${record.skillId}:${record.snapshotId}:${record.artifactDigest}`),
  );
  const artifacts = await fetchArtifacts(records, {
    concurrency: options.artifactConcurrency ?? 8,
    fetchArtifact: async (record) => {
      const response = await fetchImpl(record.artifactUrl, {
        signal: AbortSignal.timeout(PAGEFIND_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Artifact ${record.skillId} failed with HTTP ${response.status}.`);
      }
      const body = await response.arrayBuffer();
      return new Uint8Array(body);
    },
    retries: 2,
    verifyArtifact: verifyArtifactDigest,
  });

  const pagefind =
    options.pagefindModule ?? ((await import("pagefind")) as unknown as PagefindModule);
  const created = await pagefind.createIndex({
    includeCharacters: PAGEFIND_INCLUDE_CHARACTERS,
    verbose: false,
  });
  if (!created.index || created.errors?.length) {
    throw new Error(`Pagefind index creation failed: ${created.errors?.join("; ") ?? "unknown"}`);
  }

  try {
    await addRecordsToPagefind(records, artifacts, created.index);
    await mkdir(options.outputPath, { recursive: true });
    const writeResult = await created.index.writeFiles({ outputPath: options.outputPath });
    if (writeResult.errors?.length) {
      throw new Error(`Pagefind bundle write failed: ${writeResult.errors.join("; ")}`);
    }
  } finally {
    await pagefind.close();
  }

  const manifest: PagefindGenerationManifest = pagefindGenerationManifestSchema.parse({
    bundleUrl: `${new URL(options.assetOrigin).origin}/pagefind/generations/${generationId}/pagefind/`,
    generationId,
    pagefindVersion: "1.5.2",
    publishedAt: Date.now(),
    recordCount: records.length,
    schemaVersion: 1,
    sourceWatermark,
  });
  const manifestPath = join(dirname(options.outputPath), "generation.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  const bundleStats = await validatePagefindBundle(options.outputPath, records.length);
  return {
    bundleBytes: bundleStats.bundleBytes,
    bundleUrl: manifest.bundleUrl,
    durationMs: Date.now() - startedAt,
    generationId,
    manifestPath,
    outputPath: options.outputPath,
    recordCount: records.length,
    shardCount: bundleStats.shardCount,
    sourceWatermark,
  };
};
