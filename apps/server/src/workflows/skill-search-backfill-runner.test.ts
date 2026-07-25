/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { SkillSearchBackfillRow } from "@skills-re/api/modules/skills/search-documents-repo";
import { runSkillSearchBackfillWorkflow } from "./skill-search-backfill-runner";
import { createWorkflowStepStub } from "./test-support";

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hashText = async (value: string) =>
  toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

const refreshSkillSearchDocumentMetadataNoop = () =>
  Promise.resolve({ status: "refreshed" as const });

const createRow = async (overrides: Partial<SkillSearchBackfillRow> = {}) => ({
  authorHandle: "acme",
  description: "Widget skill",
  documentContentHash: null,
  documentIndexingStatus: null,
  documentSnapshotId: null,
  entryFileHash: await hashText("body"),
  entryPath: "skills/widget/SKILL.md",
  entryR2Key: "snapshots/snapshot-1/SKILL.md",
  repoName: "skills",
  skillContentHash: "content-hash-1",
  skillId: "skill-1",
  skillSlug: "widget",
  snapshotId: "snapshot-1",
  title: "Widget",
  updatedAt: 100,
  ...overrides,
});

describe("runSkillSearchBackfillWorkflow", () => {
  test("indexes a verified snapshot object and schedules continuation", async () => {
    const indexed: unknown[] = [];
    const refreshed: unknown[] = [];
    const scheduled: unknown[] = [];
    const row = await createRow();

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {
          batchSize: 1,
          cursor: "cursor-1",
        },
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: (input) => {
          expect(input).toEqual({ cursor: "cursor-1", limit: 1 });
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [row],
          });
        },
        refreshSkillSearchDocumentMetadata: (skillId) => {
          refreshed.push(skillId);
          return Promise.resolve({ status: "refreshed" as const });
        },
        replaceSkillSearchDocument: (input) => {
          indexed.push(input);
          return Promise.resolve({
            indexingStatus: "indexed" as const,
            status: "replaced" as const,
          });
        },
        scheduleContinuation: {
          enqueue(payload, options) {
            scheduled.push({ options, payload });
            return Promise.resolve({ workId: "skill-search-backfill-2" });
          },
        },
        snapshotStorage: {
          getSnapshotFileObject: () =>
            Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            }),
        } as never,
      },
    );

    expect(indexed).toEqual([
      expect.objectContaining({
        body: "body",
        contentHash: "content-hash-1",
        skillId: "skill-1",
        snapshotId: "snapshot-1",
      }),
    ]);
    expect(refreshed).toEqual(["skill-1"]);
    expect(scheduled).toEqual([
      {
        options: { delaySeconds: 60 },
        payload: { batchSize: 1, cursor: "cursor-2" },
      },
    ]);
    expect(result).toEqual({
      continueCursor: "cursor-2",
      deletedCount: 0,
      failedCount: 0,
      hashMismatchCount: 0,
      indexedCount: 1,
      isDone: false,
      metadataDeletedCount: 0,
      metadataRefreshedCount: 1,
      missingObjectCount: 0,
      oversizedCount: 0,
      skippedCount: 0,
      processedCount: 1,
      skippedStaleCount: 0,
    });
  });

  test("counts missing objects, digest mismatches, stale writers, and truncated bodies", async () => {
    const validHash = await hashText("body");
    const rows = [
      await createRow({ entryR2Key: "missing", skillId: "skill-missing" }),
      await createRow({
        entryFileHash: "0".repeat(64),
        entryR2Key: "mismatch",
        skillId: "skill-mismatch",
      }),
      await createRow({ entryFileHash: validHash, entryR2Key: "stale", skillId: "skill-stale" }),
      await createRow({
        entryFileHash: validHash,
        entryR2Key: "truncated",
        skillId: "skill-truncated",
      }),
    ];

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {
          batchSize: 10,
        },
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: () =>
          Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: rows,
          }),
        refreshSkillSearchDocumentMetadata: refreshSkillSearchDocumentMetadataNoop,
        replaceSkillSearchDocument: (input) =>
          Promise.resolve(
            input.skillId === "skill-stale"
              ? { status: "skipped-stale" as const }
              : { indexingStatus: "truncated" as const, status: "replaced" as const },
          ),
        snapshotStorage: {
          getSnapshotFileObject: (key: string) => {
            if (key === "missing") {
              return Promise.resolve(null);
            }
            return Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            });
          },
        } as never,
      },
    );

    expect(result).toMatchObject({
      deletedCount: 0,
      failedCount: 0,
      hashMismatchCount: 1,
      indexedCount: 1,
      missingObjectCount: 1,
      oversizedCount: 1,
      processedCount: 4,
      skippedCount: 3,
      skippedStaleCount: 1,
    });
  });

  test("counts deleted search documents without treating them as indexed", async () => {
    const rows = [
      await createRow({ skillId: "skill-deleted" }),
      await createRow({ skillId: "skill-indexed" }),
    ];
    const refreshed: unknown[] = [];

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {},
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: () =>
          Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: rows,
          }),
        refreshSkillSearchDocumentMetadata: (skillId) => {
          refreshed.push(skillId);
          return Promise.resolve({ status: "deleted" as const });
        },
        replaceSkillSearchDocument: (input) =>
          Promise.resolve(
            input.skillId === "skill-deleted"
              ? { status: "deleted" as const }
              : { indexingStatus: "indexed" as const, status: "replaced" as const },
          ),
        snapshotStorage: {
          getSnapshotFileObject: () =>
            Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            }),
        } as never,
      },
    );

    expect(refreshed).toEqual(["skill-indexed"]);
    expect(result).toMatchObject({
      deletedCount: 1,
      indexedCount: 1,
      metadataDeletedCount: 1,
      metadataRefreshedCount: 0,
      processedCount: 2,
      skippedCount: 0,
    });
  });

  test("uses repair mode page source and preserves mode on continuation", async () => {
    const row = await createRow();
    const calls: string[] = [];
    const scheduled: unknown[] = [];

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {
          batchSize: 500,
          cursor: "repair-cursor-1",
          mode: "repair",
        },
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: () => {
          calls.push("eligible");
          return Promise.resolve({ continueCursor: "", isDone: true, page: [] });
        },
        listRepairableSkillSearchBackfillPage: (input = {}) => {
          calls.push(`repair:${input.cursor}:${input.limit}`);
          return Promise.resolve({
            continueCursor: "repair-cursor-2",
            isDone: false,
            page: [row],
          });
        },
        refreshSkillSearchDocumentMetadata: refreshSkillSearchDocumentMetadataNoop,
        replaceSkillSearchDocument: () =>
          Promise.resolve({ indexingStatus: "indexed" as const, status: "replaced" as const }),
        scheduleContinuation: {
          enqueue(payload, options) {
            scheduled.push({ options, payload });
            return Promise.resolve({ workId: "skill-search-repair-2" });
          },
        },
        snapshotStorage: {
          getSnapshotFileObject: () =>
            Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            }),
        } as never,
      },
    );

    expect(calls).toEqual(["repair:repair-cursor-1:100"]);
    expect(scheduled).toEqual([
      {
        options: { delaySeconds: 60 },
        payload: {
          batchSize: 100,
          cursor: "repair-cursor-2",
          mode: "repair",
        },
      },
    ]);
    expect(result).toMatchObject({
      indexedCount: 1,
      isDone: false,
      processedCount: 1,
    });
  });

  test("keeps duplicate delivery idempotent by replacing the same skill document twice", async () => {
    const row = await createRow({ skillId: "skill-duplicate" });
    const replacedSkillIds: unknown[] = [];

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {},
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: () =>
          Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [row, row],
          }),
        refreshSkillSearchDocumentMetadata: refreshSkillSearchDocumentMetadataNoop,
        replaceSkillSearchDocument: (input) => {
          replacedSkillIds.push(input.skillId);
          return Promise.resolve({
            indexingStatus: "indexed" as const,
            status: "replaced" as const,
          });
        },
        snapshotStorage: {
          getSnapshotFileObject: () =>
            Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            }),
        } as never,
      },
    );

    expect(replacedSkillIds).toEqual(["skill-duplicate", "skill-duplicate"]);
    expect(result).toMatchObject({
      indexedCount: 2,
      processedCount: 2,
    });
  });

  test("continues after a partial R2 read failure and reports terminal counts", async () => {
    const validHash = await hashText("body");
    const rows = [
      await createRow({ entryFileHash: validHash, entryR2Key: "throws", skillId: "skill-failed" }),
      await createRow({ entryFileHash: validHash, entryR2Key: "ok", skillId: "skill-ok" }),
    ];

    const result = await runSkillSearchBackfillWorkflow(
      {
        payload: {
          batchSize: 2,
        },
      },
      createWorkflowStepStub() as never,
      {
        listEligibleSkillSearchBackfillPage: () =>
          Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: rows,
          }),
        refreshSkillSearchDocumentMetadata: refreshSkillSearchDocumentMetadataNoop,
        replaceSkillSearchDocument: () =>
          Promise.resolve({ indexingStatus: "indexed" as const, status: "replaced" as const }),
        snapshotStorage: {
          getSnapshotFileObject: (key: string) => {
            if (key === "throws") {
              throw new Error("R2 read failed");
            }
            return Promise.resolve({
              arrayBuffer: () => Promise.resolve(new TextEncoder().encode("body").buffer),
            });
          },
        } as never,
      },
    );

    expect(result).toEqual({
      continueCursor: "",
      deletedCount: 0,
      failedCount: 1,
      hashMismatchCount: 0,
      indexedCount: 1,
      isDone: true,
      metadataDeletedCount: 0,
      metadataRefreshedCount: 1,
      missingObjectCount: 0,
      oversizedCount: 0,
      processedCount: 2,
      skippedCount: 0,
      skippedStaleCount: 0,
    });
  });
});
