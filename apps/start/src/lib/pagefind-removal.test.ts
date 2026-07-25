/// <reference types="bun-types" />

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const START_SRC_DIR = join(import.meta.dir, "..");
const THIS_FILE = "pagefind-removal.test.ts";
const FORBIDDEN_START_PAGEFIND_MARKERS = [
  "hydratePagefindHits",
  "/pagefind/",
  "VITE_PAGEFIND",
  "pagefind-search",
  "pagefind-csp",
] as const;

const listSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if ((fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) && !fullPath.endsWith(THIS_FILE)) {
      files.push(fullPath);
    }
  }

  return files;
};

describe("Start Pagefind removal", () => {
  test("does not request Pagefind assets or hydrate Pagefind hits from frontend code", () => {
    const matches: string[] = [];

    for (const file of listSourceFiles(START_SRC_DIR)) {
      const source = readFileSync(file, "utf8");
      for (const marker of FORBIDDEN_START_PAGEFIND_MARKERS) {
        if (source.includes(marker)) {
          matches.push(`${file}: ${marker}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });
});
