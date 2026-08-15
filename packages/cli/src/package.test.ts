/// <reference types="bun-types" />

import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzipDecoder, unpackTar } from "modern-tar";

const CLI_PACKAGE_DIR = fileURLToPath(new URL("..", import.meta.url));

test("npm package excludes workspace-only dependency protocols", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "skills-re-cli-pack-"));
  try {
    const npmCacheDirectory = join(outputDirectory, "npm-cache");
    const packProcess = Bun.spawn(
      ["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", outputDirectory],
      {
        cwd: CLI_PACKAGE_DIR,
        env: { ...process.env, npm_config_cache: npmCacheDirectory },
        stderr: "pipe",
        stdout: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      packProcess.exited,
      new Response(packProcess.stdout).text(),
      new Response(packProcess.stderr).text(),
    ]);

    expect(exitCode, stderr).toBe(0);
    const [{ filename }] = JSON.parse(stdout) as [{ filename: string }];
    const archiveBytes = await readFile(join(outputDirectory, filename));
    const archiveStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(archiveBytes);
        controller.close();
      },
    });
    const entries = await unpackTar(archiveStream.pipeThrough(createGzipDecoder()));
    const packageManifest = entries.find((entry) => entry.header.name === "package/package.json");

    expect(packageManifest?.data).toBeDefined();
    const publishedPackage = JSON.parse(new TextDecoder().decode(packageManifest?.data)) as {
      dependencies?: Record<string, string>;
    };
    const unsupportedDependencies = Object.entries(publishedPackage.dependencies ?? {}).filter(
      ([, version]) => version.startsWith("catalog:") || version.startsWith("workspace:"),
    );

    expect(publishedPackage.dependencies?.zod).toBeDefined();
    expect(unsupportedDependencies).toEqual([]);
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});
