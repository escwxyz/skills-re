/// <reference types="bun-types" />

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "bun:test";

const REPO_ROOT = join(import.meta.dir, "../../../../..");
const FORBIDDEN_PAGEFIND_MARKERS = [
  "Pagefind",
  "pagefind",
  "hydratePagefindHits",
  "pagefind-index",
  "search-index",
  "PAGEFIND",
  "VITE_PAGEFIND",
] as const;

const SCAN_ROOTS = [
  ".github/workflows",
  "apps/server/src",
  "apps/start/src",
  "packages/api/src",
  "packages/contract/src",
  "packages/env/src",
  "packages/infra",
  "package.json",
  "bun.lock",
] as const;

const ALLOWED_RELATIVE_FILES = new Set([
  "apps/start/src/lib/pagefind-removal.test.ts",
  "packages/api/src/modules/skills/pagefind-removal.test.ts",
]);

const IGNORED_DIRECTORY_NAMES = new Set(["node_modules", ".turbo", "dist", "build"]);

const isScannedFile = (path: string) =>
  path.endsWith(".ts") ||
  path.endsWith(".tsx") ||
  path.endsWith(".json") ||
  path.endsWith(".yml") ||
  path.endsWith(".yaml") ||
  path.endsWith(".lock");

const listFiles = (path: string): string[] => {
  const absolutePath = join(REPO_ROOT, path);
  const stat = statSync(absolutePath);
  if (stat.isFile()) {
    return [absolutePath];
  }

  const files: string[] = [];
  for (const entry of readdirSync(absolutePath)) {
    if (IGNORED_DIRECTORY_NAMES.has(entry)) {
      continue;
    }

    const child = join(absolutePath, entry);
    const childStat = statSync(child);
    if (childStat.isDirectory()) {
      files.push(...listFiles(relative(REPO_ROOT, child)));
    } else if (isScannedFile(child)) {
      files.push(child);
    }
  }
  return files;
};

describe("Pagefind removal", () => {
  test("leaves no Pagefind runtime, package, workflow, API, or infrastructure surface", () => {
    const matches: string[] = [];

    for (const scanRoot of SCAN_ROOTS) {
      for (const file of listFiles(scanRoot)) {
        const relativeFile = relative(REPO_ROOT, file);
        if (ALLOWED_RELATIVE_FILES.has(relativeFile)) {
          continue;
        }

        const source = readFileSync(file, "utf8");
        for (const marker of FORBIDDEN_PAGEFIND_MARKERS) {
          if (source.includes(marker)) {
            matches.push(`${relativeFile}: ${marker}`);
          }
        }
      }
    }

    expect(matches).toEqual([]);
  });
});
