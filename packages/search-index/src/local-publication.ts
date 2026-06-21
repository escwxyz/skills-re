import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { pagefindGenerationManifestSchema } from "@skills-re/contract/pagefind";

import {
  cleanupExpiredGenerations,
  publishGeneration,
  selectExpiredGenerationIds,
} from "./publisher";
import type { PublishedGenerationDescriptor, PublishFile } from "./publisher";
import { WranglerR2Store } from "./wrangler-store";

const contentTypeByExtension: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pagefind": "application/wasm",
  ".pf_fragment": "application/octet-stream",
  ".pf_index": "application/octet-stream",
  ".pf_meta": "application/octet-stream",
};

const getContentType = (path: string) => {
  const extension = Object.keys(contentTypeByExtension).find((candidate) =>
    path.endsWith(candidate),
  );
  return extension
    ? (contentTypeByExtension[extension] ?? "application/octet-stream")
    : "application/octet-stream";
};

export const readPagefindBundleFiles = async (root: string) => {
  const files: PublishFile[] = [];
  const visit = async (directory: string, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(filePath, relativePath);
      } else {
        files.push({
          bytes: new Uint8Array(await readFile(filePath)),
          contentType: getContentType(relativePath),
          path: relativePath,
        });
      }
    }
  };
  await visit(root);
  return files.toSorted((left, right) => left.path.localeCompare(right.path));
};

export const publishLocalGeneration = async (input: { bucket: string; outputPath: string }) => {
  const manifest = pagefindGenerationManifestSchema.parse(
    JSON.parse(await readFile(join(dirname(input.outputPath), "generation.json"), "utf-8")),
  );
  const store = new WranglerR2Store(input.bucket);
  const files = await readPagefindBundleFiles(input.outputPath);
  const readJson = async <T>(key: string): Promise<T | null> => {
    try {
      return JSON.parse(new TextDecoder().decode(await store.get(key))) as T;
    } catch {
      return null;
    }
  };
  const previous = await readJson<{ generationId?: string }>("pagefind/current.json");
  const history =
    (await readJson<PublishedGenerationDescriptor[]>("pagefind/generations.json")) ?? [];
  const published = await publishGeneration({
    files,
    manifest,
    smokeTest: async (activeManifest) => {
      for (const asset of ["pagefind-entry.json", "pagefind.js", "pagefind-worker.js"]) {
        const response = await fetch(new URL(asset, activeManifest.bundleUrl));
        if (!response.ok) {
          throw new Error(
            `Remote Pagefind smoke check failed for ${asset}: HTTP ${response.status}.`,
          );
        }
      }
    },
    store,
  });
  const descriptor: PublishedGenerationDescriptor = {
    ...manifest,
    files: files.map((file) => file.path),
  };
  const nextHistory = [
    ...history.filter((generation) => generation.generationId !== descriptor.generationId),
    descriptor,
  ].toSorted((left, right) => right.publishedAt - left.publishedAt);
  const expiredGenerationIds = selectExpiredGenerationIds(nextHistory, {
    activeGenerationId: descriptor.generationId,
    now: Date.now(),
    previousGenerationId: previous?.generationId ?? descriptor.generationId,
  });
  await cleanupExpiredGenerations({
    deleteKey: async (key) => await store.delete(key),
    descriptors: nextHistory,
    expiredGenerationIds,
  });
  const retainedHistory = nextHistory.filter(
    (generation) => !expiredGenerationIds.includes(generation.generationId),
  );
  await store.put(
    "pagefind/generations.json",
    new TextEncoder().encode(`${JSON.stringify(retainedHistory, null, 2)}\n`),
    {
      cacheControl: "public, max-age=60",
      contentType: "application/json; charset=utf-8",
    },
  );
  return { ...published, expiredGenerationIds };
};

export const rollbackLocalGeneration = async (input: { bucket: string; generationId: string }) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(input.generationId)) {
    throw new Error("Invalid generation ID.");
  }
  const store = new WranglerR2Store(input.bucket);
  const generationKey = `pagefind/generations/${input.generationId}/generation.json`;
  const retained = pagefindGenerationManifestSchema.parse(
    JSON.parse(new TextDecoder().decode(await store.get(generationKey))),
  );
  if (!(await store.head(`pagefind/generations/${input.generationId}/pagefind/pagefind.js`))) {
    throw new Error(`Retained generation is incomplete: ${input.generationId}.`);
  }
  const rollbackManifest = pagefindGenerationManifestSchema.parse({
    ...retained,
    publishedAt: Date.now(),
  });
  await store.put(
    "pagefind/current.json",
    new TextEncoder().encode(`${JSON.stringify(rollbackManifest, null, 2)}\n`),
    {
      cacheControl: "public, max-age=60",
      contentType: "application/json; charset=utf-8",
    },
  );
  return rollbackManifest;
};
