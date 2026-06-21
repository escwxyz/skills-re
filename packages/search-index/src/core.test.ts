/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

const loadCore = async () =>
  (await import("./core").catch(() => ({}))) as Record<string, (...args: never[]) => unknown>;

describe("search index generator core", () => {
  test("collects all export pages and preserves the source watermark", async () => {
    const core = await loadCore();
    const cursors: (string | undefined)[] = [];
    const result = await core.collectExportRecords?.(async (cursor?: string) => {
      cursors.push(cursor);
      return cursor
        ? { continueCursor: "", isDone: true, page: [{ skillId: "skill-2" }], sourceWatermark: 42 }
        : {
            continueCursor: "next",
            isDone: false,
            page: [{ skillId: "skill-1" }],
            sourceWatermark: 42,
          };
    });

    expect(result).toEqual({
      records: [{ skillId: "skill-1" }, { skillId: "skill-2" }],
      sourceWatermark: 42,
    });
    expect(cursors).toEqual([undefined, "next"]);
  });

  test("rejects duplicate identities and creates deterministic generation IDs", async () => {
    const core = await loadCore();
    const records = [
      { canonicalUrl: "/skills/acme/repo/one", skillId: "skill-1" },
      { canonicalUrl: "/skills/acme/repo/two", skillId: "skill-1" },
    ];

    expect(() => core.assertUniqueRecords?.(records)).toThrow("Duplicate skill ID");
    const first = await core.createGenerationId?.(123, ["a", "b"]);
    const second = await core.createGenerationId?.(123, ["a", "b"]);
    expect(first).toBe(second);
  });

  test("verifies artifact digests", async () => {
    const core = await loadCore();
    const bytes = new TextEncoder().encode("skill content");
    const digest = `sha256:${new Bun.CryptoHasher("sha256").update(bytes).digest("hex")}`;

    await expect(core.verifyArtifactDigest?.(bytes, digest)).resolves.toBeUndefined();
    await expect(core.verifyArtifactDigest?.(bytes, `sha256:${"0".repeat(64)}`)).rejects.toThrow(
      "digest mismatch",
    );
  });

  test("bounds artifact fetch concurrency and retries transient failures", async () => {
    const core = await loadCore();
    let active = 0;
    let maxActive = 0;
    const attempts = new Map<string, number>();
    const records = Array.from({ length: 5 }, (_, index) => ({
      artifactDigest: "digest",
      artifactUrl: `https://example.com/${index}`,
      skillId: `skill-${index}`,
    }));

    const result = await core.fetchArtifacts?.(records, {
      concurrency: 2,
      fetchArtifact: async (record: { skillId: string }) => {
        const attempt = (attempts.get(record.skillId) ?? 0) + 1;
        attempts.set(record.skillId, attempt);
        if (record.skillId === "skill-0" && attempt === 1) {
          throw new Error("temporary");
        }
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Bun.sleep(2);
        active -= 1;
        return new Uint8Array([attempt]);
      },
      retries: 1,
      verifyArtifact: async () => undefined,
    });

    expect((result as unknown[])?.length).toBe(5);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(attempts.get("skill-0")).toBe(2);
  });
});
