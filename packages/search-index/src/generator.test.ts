/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Pagefind bundle generator", () => {
  test("indexes full content with weighted metadata, filters, sorts, and detected language", async () => {
    const generator = (await import("./generator").catch(() => ({}))) as {
      addRecordsToPagefind?: (
        records: Record<string, unknown>[],
        artifacts: { bytes: Uint8Array; record: Record<string, unknown> }[],
        index: { addCustomRecord: (record: Record<string, unknown>) => Promise<unknown> },
      ) => Promise<void>;
    };
    const added: Record<string, unknown>[] = [];
    const record = {
      authorHandle: "acme",
      canonicalUrl: "/skills/acme/repo/search",
      description: "Search skill bodies",
      isVerified: true,
      primaryCategory: "search",
      repoName: "repo",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      tags: ["web", "search"],
      title: "Pagefind Search",
      updatedAt: 123,
    };

    await generator.addRecordsToPagefind?.(
      [record],
      [{ bytes: new TextEncoder().encode("技能搜索 and C++"), record }],
      {
        addCustomRecord: async (value) => {
          added.push(value);
          return { errors: [] };
        },
      },
    );

    expect(added).toEqual([
      {
        content: "技能搜索 and C++",
        filters: {
          author: ["acme"],
          category: ["search"],
          tags: ["search", "web"],
          verified: ["true"],
        },
        language: "zh",
        meta: {
          author: "acme",
          description: "Search skill bodies",
          repository: "repo",
          skillId: "skill-1",
          snapshotId: "snapshot-1",
          title: "Pagefind Search",
        },
        sort: { updatedAt: "123" },
        url: "/skills/acme/repo/search",
      },
    ]);
  });

  test("writes and validates a complete real Pagefind bundle", async () => {
    const generator = await import("./generator");
    const outputRoot = await mkdtemp(join(tmpdir(), "skills-re-pagefind-"));
    const outputPath = join(outputRoot, "pagefind");
    const content = new TextEncoder().encode("Full body includes reciprocal rank fusion.");
    const digest = `sha256:${new Bun.CryptoHasher("sha256").update(content).digest("hex")}`;
    const fetchSignals: (AbortSignal | null | undefined)[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      fetchSignals.push(init?.signal);
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
      if (url.pathname === "/skills/pagefind/export") {
        return Response.json({
          continueCursor: "",
          isDone: true,
          page: [
            {
              artifactDigest: digest,
              artifactUrl: "https://api.example.com/artifacts/skill-1.md",
              authorHandle: "acme",
              canonicalUrl: "/skills/acme/repo/search",
              description: "Search descriptions",
              isVerified: true,
              primaryCategory: "search",
              repoName: "repo",
              skillId: "skill-1",
              skillSlug: "search",
              snapshotId: "snapshot-1",
              tags: ["search"],
              title: "Search",
              updatedAt: 123,
            },
          ],
          sourceWatermark: 123,
        });
      }
      return new Response(content);
    };

    try {
      const summary = await generator.generatePagefindBundle({
        assetOrigin: "https://search.example.com",
        automationToken: "secret",
        fetchImpl: fetchImpl as typeof fetch,
        outputPath,
        serverOrigin: "https://api.example.com",
      });
      const validate = (
        generator as unknown as {
          validatePagefindBundle?: (path: string, recordCount: number) => Promise<unknown>;
        }
      ).validatePagefindBundle;

      expect(validate).toBeDefined();
      await expect(validate?.(outputPath, 1)).resolves.toMatchObject({ recordCount: 1 });
      expect(summary.bundleBytes).toBeGreaterThan(0);
      expect(fetchSignals).toHaveLength(2);
      expect(fetchSignals.every((signal) => signal instanceof AbortSignal && !signal.aborted)).toBe(
        true,
      );
    } finally {
      await rm(outputRoot, { force: true, recursive: true });
    }
  });
});
