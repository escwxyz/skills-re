/// <reference types="bun-types" />

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { prepareBoundedScanInput } from "./scan-input-limit";

describe("prepareBoundedScanInput", () => {
  test("copies scan input while keeping oversized files within the per-file limit", async () => {
    const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "scan-input-limit-"));
    const sourceDir = path.join(workspaceDir, "source");
    await mkdir(path.join(sourceDir, "references"), { recursive: true });
    await writeFile(path.join(sourceDir, "SKILL.md"), "small", "utf-8");
    await writeFile(path.join(sourceDir, "references", "large.md"), "a".repeat(12), "utf-8");

    const result = await prepareBoundedScanInput({
      maxFileChars: 10,
      sourceDir,
      workspaceDir,
    });

    const skill = await readFile(path.join(result.scanDir, "SKILL.md"), "utf-8");
    const large = await readFile(path.join(result.scanDir, "references", "large.md"), "utf-8");

    expect(skill).toBe("small");
    expect(large.length).toBeLessThanOrEqual(10);
    expect(result.truncatedFiles).toEqual([
      {
        originalChars: 12,
        relativePath: "references/large.md",
        writtenChars: 10,
      },
    ]);
  });
});
