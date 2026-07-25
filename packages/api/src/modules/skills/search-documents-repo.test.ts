/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import {
  deleteOrphanedSkillSearchDocuments,
  getSkillSearchDatabaseCapacityReport,
  getSkillSearchDocumentDiagnostics,
  listEligibleSkillSearchBackfillPage,
  listRepairableSkillSearchBackfillPage,
  rebuildSkillSearchFtsIndex,
  reconcileSkillSearchDocuments,
  runSkillSearchFtsIntegrityCheck,
  SKILL_SEARCH_FTS_INTEGRITY_CHECK_SQL,
  SKILL_SEARCH_FTS_REBUILD_SQL,
} from "./search-documents-repo";

type QueryResult = Array<{ value: number }>;

const createDiagnosticsDb = (results: QueryResult[]) => {
  const calls: string[] = [];
  const db = {
    get runCalls() {
      return calls;
    },
    run(query: unknown) {
      calls.push(String(query));
      return Promise.resolve();
    },
    select() {
      const builder = {
        from() {
          return builder;
        },
        innerJoin() {
          return builder;
        },
        leftJoin() {
          return builder;
        },
        where() {
          return Promise.resolve(results.shift() ?? []);
        },
      };
      return builder;
    },
  };

  return db;
};

const createDiagnosticsSqlCaptureDb = () => {
  const dialect = new SQLiteSyncDialect();
  const whereSql: string[] = [];
  let queryIndex = 0;
  const db = {
    get whereSql() {
      return whereSql;
    },
    run() {
      return Promise.resolve();
    },
    select() {
      const builder = {
        from() {
          return builder;
        },
        innerJoin() {
          return builder;
        },
        leftJoin() {
          return builder;
        },
        where(query: SQL) {
          queryIndex += 1;
          whereSql.push(dialect.sqlToQuery(query).sql);
          return Promise.resolve([{ value: queryIndex }]);
        },
      };
      return builder;
    },
  };

  return db;
};

const createBackfillDb = (rows: unknown[]) => {
  const calls: string[] = [];
  const db = {
    get calls() {
      return calls;
    },
    get() {
      return Promise.resolve(null);
    },
    run() {
      return Promise.resolve();
    },
    select() {
      const builder = {
        from() {
          calls.push("from");
          return builder;
        },
        innerJoin() {
          calls.push("innerJoin");
          return builder;
        },
        leftJoin() {
          calls.push("leftJoin");
          return builder;
        },
        limit(limit: number) {
          calls.push(`limit:${limit}`);
          return Promise.resolve(rows);
        },
        orderBy() {
          calls.push("orderBy");
          return builder;
        },
        where() {
          calls.push("where");
          return builder;
        },
      };
      return builder;
    },
  };

  return db;
};

const createCapacityDb = (input: {
  documentCount: number;
  indexedBodyBytes: number;
  pageCount: number;
  pageSize: number;
}) => {
  let getCount = 0;
  const db = {
    get() {
      getCount += 1;
      return Promise.resolve(
        getCount === 1 ? { page_size: input.pageSize } : { page_count: input.pageCount },
      );
    },
    run() {
      return Promise.resolve();
    },
    select() {
      return {
        from() {
          return {
            where() {
              return Promise.resolve([
                {
                  documentCount: input.documentCount,
                  indexedBodyBytes: input.indexedBodyBytes,
                },
              ]);
            },
          };
        },
      };
    },
  };
  return db;
};

const encodeBackfillCursorPayload = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");

describe("skill search document diagnostics repository", () => {
  test("maps diagnostic count rows into named operational counters", async () => {
    const db = createDiagnosticsDb([
      [{ value: 10 }],
      [{ value: 9 }],
      [{ value: 1 }],
      [{ value: 2 }],
      [{ value: 3 }],
      [{ value: 4 }],
    ]);

    await expect(getSkillSearchDocumentDiagnostics(db as never)).resolves.toEqual({
      documentCount: 9,
      eligiblePublicSkills: 10,
      hashMismatchCount: 2,
      orphanedOrIneligibleCount: 3,
      oversizedDocumentCount: 4,
      staleSnapshotCount: 1,
    });
  });

  test("counts stale documents when the skill latest snapshot is null", async () => {
    const db = createDiagnosticsSqlCaptureDb();

    await expect(getSkillSearchDocumentDiagnostics(db as never)).resolves.toMatchObject({
      staleSnapshotCount: 3,
    });

    expect(db.whereSql[2]).toContain('"skills"."latest_snapshot_id" is null');
    expect(db.whereSql[2]).toContain('"skill_search_documents"."snapshot_id" <>');
  });

  test("exposes explicit FTS integrity and rebuild commands", async () => {
    const integrityDb = createDiagnosticsDb([]);
    await runSkillSearchFtsIntegrityCheck(integrityDb as never);
    expect(integrityDb.runCalls).toHaveLength(1);
    expect(SKILL_SEARCH_FTS_INTEGRITY_CHECK_SQL).toContain("integrity-check");

    const rebuildDb = createDiagnosticsDb([]);
    await rebuildSkillSearchFtsIndex(rebuildDb as never);
    expect(rebuildDb.runCalls).toHaveLength(1);
    expect(SKILL_SEARCH_FTS_REBUILD_SQL).toContain("rebuild");
  });

  test("lists eligible public skill documents for resumable backfill", async () => {
    const rows = [
      {
        authorHandle: "acme",
        description: "Widget skill",
        documentContentHash: null,
        documentIndexingStatus: null,
        documentSnapshotId: null,
        entryFileHash: "file-hash-1",
        entryPath: "skills/widget/SKILL.md",
        entryR2Key: "snapshots/snapshot-1/SKILL.md",
        repoName: "skills",
        skillContentHash: "content-hash-1",
        skillId: "skill-1",
        skillSlug: "widget",
        snapshotId: "snapshot-1",
        title: "Widget",
        updatedAt: 100,
      },
      {
        authorHandle: "acme",
        description: "Agent skill",
        documentContentHash: "content-hash-2",
        documentIndexingStatus: "indexed",
        documentSnapshotId: "snapshot-2",
        entryFileHash: "file-hash-2",
        entryPath: "skills/agent/SKILL.md",
        entryR2Key: "snapshots/snapshot-2/SKILL.md",
        repoName: "skills",
        skillContentHash: "content-hash-2",
        skillId: "skill-2",
        skillSlug: "agent",
        snapshotId: "snapshot-2",
        title: "Agent",
        updatedAt: 200,
      },
    ];
    const db = createBackfillDb(rows);

    await expect(listEligibleSkillSearchBackfillPage({ limit: 1 }, db as never)).resolves.toEqual({
      continueCursor: expect.any(String),
      isDone: false,
      page: [rows[0]],
    });
    expect(db.calls).toContain("limit:2");
  });

  test("uses the fetched row count to detect more backfill pages after filtering", async () => {
    const rows = [
      {
        authorHandle: "acme",
        description: "Widget skill",
        documentContentHash: null,
        documentIndexingStatus: null,
        documentSnapshotId: null,
        entryFileHash: "file-hash-1",
        entryPath: "skills/widget/SKILL.md",
        entryR2Key: "snapshots/snapshot-1/SKILL.md",
        repoName: "skills",
        skillContentHash: "content-hash-1",
        skillId: "skill-1",
        skillSlug: "widget",
        snapshotId: "snapshot-1",
        title: "Widget",
        updatedAt: 100,
      },
      {
        authorHandle: "acme",
        description: "Filtered probe row",
        documentContentHash: null,
        documentIndexingStatus: null,
        documentSnapshotId: null,
        entryFileHash: "file-hash-2",
        entryPath: "skills/probe/SKILL.md",
        entryR2Key: null,
        repoName: "skills",
        skillContentHash: "content-hash-2",
        skillId: "skill-2",
        skillSlug: "probe",
        snapshotId: "snapshot-2",
        title: "Probe",
        updatedAt: 200,
      },
    ];
    const db = createBackfillDb(rows);

    await expect(listEligibleSkillSearchBackfillPage({ limit: 1 }, db as never)).resolves.toEqual({
      continueCursor: expect.any(String),
      isDone: false,
      page: [rows[0]],
    });
  });

  test("treats an absent backfill cursor as the first page", async () => {
    const db = createBackfillDb([]);

    await expect(listEligibleSkillSearchBackfillPage({}, db as never)).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });
    expect(db.calls).toContain("where");
  });

  test("throws on malformed backfill cursors instead of restarting from the first page", async () => {
    const db = createBackfillDb([]);

    await expect(
      listEligibleSkillSearchBackfillPage({ cursor: "not-json" }, db as never),
    ).rejects.toThrow("Invalid skill search backfill cursor: malformed token.");
    expect(db.calls).toEqual([]);
  });

  test("throws on structurally invalid backfill cursors", async () => {
    const db = createBackfillDb([]);

    await expect(
      listEligibleSkillSearchBackfillPage(
        {
          cursor: encodeBackfillCursorPayload({ id: 123, updatedAt: "later" }),
        },
        db as never,
      ),
    ).rejects.toThrow(
      "Invalid skill search backfill cursor: expected string id and numeric updatedAt.",
    );
    expect(db.calls).toEqual([]);
  });

  test("lists only repairable skill documents for reconciliation backfill", async () => {
    const rows = [
      {
        authorHandle: "acme",
        description: "Widget skill",
        documentContentHash: "old-content-hash",
        documentIndexingStatus: "indexed",
        documentSnapshotId: "old-snapshot",
        entryFileHash: "file-hash-1",
        entryPath: "skills/widget/SKILL.md",
        entryR2Key: "snapshots/snapshot-1/SKILL.md",
        repoName: "skills",
        skillContentHash: "content-hash-1",
        skillId: "skill-1",
        skillSlug: "widget",
        snapshotId: "snapshot-1",
        title: "Widget",
        updatedAt: 100,
      },
    ];
    const db = createBackfillDb(rows);

    await expect(
      listRepairableSkillSearchBackfillPage({ limit: 10 }, db as never),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: rows,
    });
    expect(db.calls).toContain("where");
  });

  test("removes orphaned or private search documents and can run FTS maintenance", async () => {
    const db = createDiagnosticsDb([
      [{ value: 10 }],
      [{ value: 9 }],
      [{ value: 0 }],
      [{ value: 0 }],
      [{ value: 0 }],
      [{ value: 1 }],
    ]);

    await expect(
      reconcileSkillSearchDocuments({ rebuildFts: true, runIntegrityCheck: true }, db as never),
    ).resolves.toEqual({
      documentCount: 9,
      eligiblePublicSkills: 10,
      hashMismatchCount: 0,
      orphanedOrIneligibleCount: 0,
      oversizedDocumentCount: 1,
      staleSnapshotCount: 0,
    });

    expect(db.runCalls).toHaveLength(3);

    const cleanupOnlyDb = createDiagnosticsDb([]);
    await deleteOrphanedSkillSearchDocuments(cleanupOnlyDb as never);
    expect(cleanupOnlyDb.runCalls).toHaveLength(1);
  });

  test("reports database capacity and permits rollout below the safety threshold", async () => {
    const db = createCapacityDb({
      documentCount: 1000,
      indexedBodyBytes: 10_000_000,
      pageCount: 50_000,
      pageSize: 4096,
    });

    await expect(
      getSkillSearchDatabaseCapacityReport(
        {
          acceptedProjectionBytes: 3_000_000_000,
          baseDatabaseBytes: 100_000_000,
          plannedSkillCount: 20_000,
        },
        db as never,
      ),
    ).resolves.toMatchObject({
      actualDatabaseBytes: 204_800_000,
      blocksRollout: false,
      documentCount: 1000,
      projectedTotalBytes: 2_196_000_000,
    });
  });

  test("blocks rollout when projected database size exceeds the accepted threshold", async () => {
    const db = createCapacityDb({
      documentCount: 100,
      indexedBodyBytes: 100_000_000,
      pageCount: 150_000,
      pageSize: 4096,
    });

    await expect(
      getSkillSearchDatabaseCapacityReport(
        {
          acceptedProjectionBytes: 500_000_000,
          baseDatabaseBytes: 100_000_000,
          internalCeilingBytes: 5_000_000_000,
          plannedSkillCount: 20_000,
        },
        db as never,
      ),
    ).resolves.toMatchObject({
      blocksRollout: true,
      safetyThresholdBytes: 4_000_000_000,
    });
  });
});
