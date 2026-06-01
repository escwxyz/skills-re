/// <reference types="bun-types" />

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

describe("prepareBoundedScanInput", () => {
  test("copies scan input while keeping oversized files within the per-file limit", async () => {
    const { prepareBoundedScanInput } = await import("./scan-input-limit");
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
        relativePath: "references/large.md",
        writtenChars: 10,
      },
    ]);
  });

  test("reads only until the configured limit when bounded text is streamed", async () => {
    const { readBoundedText } = await import("./scan-input-limit");
    let yieldedChunks = 0;

    const result = await readBoundedText(
      "ignored.txt",
      10,
      () =>
        ({
          async *[Symbol.asyncIterator]() {
            yieldedChunks += 1;
            yield "0123456789abcdef";
            yieldedChunks += 1;
            yield "this chunk should never be consumed";
          },
          destroy() {},
        }) as Parameters<typeof readBoundedText>[2],
    );

    expect(result.truncated).toBe(true);
    expect(result.content.length).toBe(10);
    expect(yieldedChunks).toBe(1);
  });
});
