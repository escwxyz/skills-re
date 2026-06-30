/// <reference types="bun-types" />

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as pagefind from "pagefind";

import { PAGEFIND_META_WEIGHTS } from "./generator";

const temporaryDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryDirectories.map(
      async (directory) => await rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("Pagefind relevance configuration", () => {
  test("finds body-only terms and ranks title matches first", async () => {
    const { index } = await pagefind.createIndex({ forceLanguage: "en" });
    if (!index) {
      throw new Error("Pagefind index was not created.");
    }
    await index.addCustomRecord({
      content: "General skill content.",
      language: "en",
      meta: { skillId: "title-match", title: "Reciprocal ranking" },
      url: "/title-match",
    });
    await index.addCustomRecord({
      content: "This body explains reciprocal ranking and fusion in detail.",
      language: "en",
      meta: { skillId: "body-match", title: "Search notes" },
      url: "/body-match",
    });
    const { files } = await index.getFiles();
    await pagefind.close();

    const fileByPath = new Map(files.map((file) => [file.path, file.content]));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: string | URL | Request) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        const content = fileByPath.get(url.pathname.slice(1));
        return content
          ? new Response(content, {
              headers: {
                "Content-Type": url.pathname.endsWith(".pagefind")
                  ? "application/wasm"
                  : "application/octet-stream",
              },
            })
          : new Response("Not found", { status: 404 });
      }) as typeof fetch;
      const directory = await mkdtemp(join(tmpdir(), "skills-re-pagefind-browser-"));
      temporaryDirectories.push(directory);
      const browserModulePath = join(directory, "pagefind.mjs");
      const browserModule = fileByPath.get("pagefind.js");
      if (!browserModule) {
        throw new Error("Generated Pagefind browser module is missing.");
      }
      await writeFile(browserModulePath, browserModule);

      const browser = await import(`${pathToFileURL(browserModulePath).href}?test=${Date.now()}`);
      await browser.options({
        basePath: "https://pagefind.test/",
        noWorker: true,
        ranking: { metaWeights: PAGEFIND_META_WEIGHTS },
      });
      const search = await browser.search("reciprocal ranking");
      const data = await Promise.all(
        search.results.map((result: { data: () => unknown }) => result.data()),
      );

      expect(data[0]?.meta.skillId).toBe("title-match");
      expect(
        data.some((result: { meta: { skillId: string } }) => result.meta.skillId === "body-match"),
      ).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
