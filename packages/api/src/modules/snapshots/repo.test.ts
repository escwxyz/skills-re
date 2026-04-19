/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSkillId, asSnapshotId } from "@skills-re/db/utils";

import { createSnapshot, deprecateSnapshotsBeyondLimit, setSkillLatestSnapshot } from "./repo";

describe("snapshots repo", () => {
  test("creates a snapshot row with snapshot defaults", async () => {
    const inserted: unknown[] = [];
    const database = {
      insert: () => ({
        values: (value: unknown) => {
          inserted.push(value);
          return {
            returning: () => [{ id: asSnapshotId("snapshot-1") }],
          };
        },
      }),
    };

    await expect(
      createSnapshot(
        {
          description: "Widget skill",
          directoryPath: "skills/acme/widget/",
          entryPath: "skills/acme/widget/skill.md",
          hash: "hash-1",
          name: "widget",
          skillId: asSkillId("skill-1"),
          sourceCommitDate: 123,
          sourceCommitMessage: "feat: add widget",
          sourceCommitSha: "sha-1",
          sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
          syncTime: 456,
          version: "1.0.0",
        },
        database as never,
      ),
    ).resolves.toEqual(asSnapshotId("snapshot-1"));

    expect(inserted[0]).toMatchObject({
      createdAtMs: 456,
      description: "Widget skill",
      directoryPath: "skills/acme/widget/",
      entryPath: "skills/acme/widget/skill.md",
      evaluationId: null,
      frontmatterHash: null,
      hash: "hash-1",
      isDeprecated: false,
      name: "widget",
      skillContentHash: null,
      skillId: asSkillId("skill-1"),
      sourceCommitDate: 123,
      sourceCommitMessage: "feat: add widget",
      sourceCommitSha: "sha-1",
      sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
      syncTime: 456,
      version: "1.0.0",
    });
    expect(typeof (inserted[0] as { id?: string }).id).toBe("string");
  });

  test("updates latest snapshot metadata on the skill row", async () => {
    const updates: unknown[] = [];
    const database = {
      update: () => ({
        set: (value: unknown) => {
          updates.push(value);
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      }),
    };

    await setSkillLatestSnapshot(
      {
        latestCommitDate: 123,
        latestCommitMessage: "feat: add widget",
        latestCommitSha: "sha-1",
        latestCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        skillId: asSkillId("skill-1"),
        snapshotId: asSnapshotId("snapshot-1"),
        syncTime: 456,
      },
      database as never,
    );

    expect(updates).toEqual([
      {
        latestCommitDate: 123,
        latestCommitMessage: "feat: add widget",
        latestCommitSha: "sha-1",
        latestCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        latestSnapshotId: "snapshot-1",
        syncTime: 456,
      },
    ]);
  });

  test("deprecates snapshots beyond the keepLatest window", async () => {
    const deprecations: unknown[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () =>
              Promise.resolve([
                { id: asSnapshotId("snapshot-1") },
                { id: asSnapshotId("snapshot-2") },
                { id: asSnapshotId("snapshot-3") },
                { id: asSnapshotId("snapshot-4") },
              ]),
          }),
        }),
      }),
      update: () => ({
        set: (value: unknown) => ({
          where: (value2: unknown) => {
            deprecations.push({ set: value, where: value2 });
            return Promise.resolve(undefined);
          },
        }),
      }),
    };

    await deprecateSnapshotsBeyondLimit(
      {
        keepLatest: 2,
        skillId: asSkillId("skill-1"),
      },
      database as never,
    );

    expect(deprecations).toHaveLength(1);
  });
});
