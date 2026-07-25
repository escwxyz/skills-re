/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  deleteSkillSearchDocument,
  prepareSkillSearchDocument,
  refreshRepoSkillSearchDocumentMetadata,
  refreshSkillSearchDocumentMetadata,
  replaceSkillSearchDocument,
} from "./search-document-service";

const createInsertDb = (skill = { latestSnapshotId: "snapshot-1", visibility: "public" }) => {
  const conflictUpdates: unknown[] = [];
  const inserts: unknown[] = [];
  const deletes: unknown[] = [];
  const db = {
    conflictUpdates,
    deletes,
    inserts,
    delete() {
      return {
        where(condition: unknown) {
          deletes.push(condition);
          return Promise.resolve();
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve(skill ? [skill] : []);
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return {
        values(value: unknown) {
          inserts.push(value);
          return {
            onConflictDoUpdate(value: unknown) {
              conflictUpdates.push(value);
              return Promise.resolve();
            },
          };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  return db;
};

const createRepoMetadataRefreshDb = () => {
  const updatedSkillIds: unknown[] = [];
  const db = {
    delete() {
      return {
        where() {
          return Promise.resolve();
        },
      };
    },
    insert() {
      throw new Error("insert should not be called");
    },
    select(input: Record<string, unknown>) {
      const isRepoListQuery = "skillId" in input;
      return {
        from() {
          return {
            innerJoin() {
              return {
                where() {
                  if (isRepoListQuery) {
                    return Promise.resolve([{ skillId: "skill-1" }, { skillId: "skill-2" }]);
                  }
                  return {
                    groupBy() {
                      return {
                        limit() {
                          return Promise.resolve([
                            {
                              authorHandle: "acme",
                              description: "Updated description",
                              latestSnapshotId: "snapshot-1",
                              repository: "skills",
                              slug: "updated",
                              tags: "automation",
                              title: "Updated",
                              visibility: "public",
                            },
                          ]);
                        },
                      };
                    },
                  };
                },
                leftJoin() {
                  return {
                    leftJoin() {
                      return {
                        where() {
                          return {
                            groupBy() {
                              return {
                                limit() {
                                  return Promise.resolve([
                                    {
                                      authorHandle: "acme",
                                      description: "Updated description",
                                      latestSnapshotId: "snapshot-1",
                                      repository: "skills",
                                      slug: "updated",
                                      tags: "automation",
                                      title: "Updated",
                                      visibility: "public",
                                    },
                                  ]);
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(value: unknown) {
          updatedSkillIds.push(value);
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
    updatedSkillIds,
  };
  return db;
};

const createMetadataRefreshDb = (
  skill: {
    authorHandle: string;
    description: string;
    latestSnapshotId: string | null;
    repository: string;
    slug: string;
    tags: string;
    title: string;
    visibility: "private" | "public";
  } | null,
) => {
  const deletes: unknown[] = [];
  const updates: unknown[] = [];
  const db = {
    deletes,
    updates,
    delete() {
      return {
        where(condition: unknown) {
          deletes.push(condition);
          return Promise.resolve();
        },
      };
    },
    insert() {
      throw new Error("insert should not be called");
    },
    select() {
      return {
        from() {
          return {
            innerJoin() {
              return {
                leftJoin() {
                  return {
                    leftJoin() {
                      return {
                        where() {
                          return {
                            groupBy() {
                              return {
                                limit() {
                                  return Promise.resolve(skill ? [skill] : []);
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(value: unknown) {
          updates.push(value);
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  return db;
};

describe("skill search document service", () => {
  test("prepares indexed bodies and searchable tag text", () => {
    expect(
      prepareSkillSearchDocument({
        authorHandle: "acme",
        body: "short body",
        contentHash: "hash-1",
        description: "Description",
        isPublic: true,
        repository: "skills",
        skillId: "skill-1" as never,
        slug: "workflow",
        snapshotId: "snapshot-1" as never,
        tags: [" automation ", "", "search"],
        title: "Workflow",
        updatedAt: 123,
      }),
    ).toMatchObject({
      body: "short body",
      bodySizeBytes: 10,
      indexingStatus: "indexed",
      tags: "automation search",
      updatedAt: 123,
    });
  });

  test("truncates oversized UTF-8 bodies and records the original byte size", () => {
    const document = prepareSkillSearchDocument({
      authorHandle: "acme",
      body: "éééé",
      contentHash: "hash-1",
      description: "Description",
      isPublic: true,
      maxIndexedBodyBytes: 4,
      repository: "skills",
      skillId: "skill-1" as never,
      slug: "workflow",
      snapshotId: "snapshot-1" as never,
      title: "Workflow",
      updatedAt: 123,
    });

    expect(document.body).toBe("éé");
    expect(document.bodySizeBytes).toBe(8);
    expect(document.indexingStatus).toBe("truncated");
    expect(document.maxIndexedBodyBytes).toBe(4);
  });

  test("does not split a multibyte UTF-8 character while truncating", () => {
    const document = prepareSkillSearchDocument({
      authorHandle: "acme",
      body: "éé",
      contentHash: "hash-1",
      description: "Description",
      isPublic: true,
      maxIndexedBodyBytes: 3,
      repository: "skills",
      skillId: "skill-1" as never,
      slug: "workflow",
      snapshotId: "snapshot-1" as never,
      title: "Workflow",
    });

    expect(document.body).toBe("é");
    expect(document.indexingStatus).toBe("truncated");
  });

  test("rejects invalid maximum body limits", () => {
    expect(() =>
      prepareSkillSearchDocument({
        authorHandle: "acme",
        body: "body",
        contentHash: "hash-1",
        description: "Description",
        isPublic: true,
        maxIndexedBodyBytes: 0,
        repository: "skills",
        skillId: "skill-1" as never,
        slug: "workflow",
        snapshotId: "snapshot-1" as never,
        title: "Workflow",
      }),
    ).toThrow("Maximum indexed body size");
  });

  test("deletes the document instead of indexing private skills", async () => {
    const db = createInsertDb();

    await expect(
      replaceSkillSearchDocument(
        {
          authorHandle: "acme",
          body: "body",
          contentHash: "hash-1",
          description: "Description",
          isPublic: false,
          repository: "skills",
          skillId: "skill-1" as never,
          slug: "workflow",
          snapshotId: "snapshot-1" as never,
          title: "Workflow",
        },
        db as never,
      ),
    ).resolves.toEqual({ status: "deleted" });

    expect(db.deletes).toHaveLength(1);
    expect(db.inserts).toHaveLength(0);
  });

  test("deletes an existing document explicitly for visibility and deletion workflows", async () => {
    const db = createInsertDb();

    await expect(deleteSkillSearchDocument("skill-1" as never, db as never)).resolves.toBe(
      undefined,
    );

    expect(db.deletes).toHaveLength(1);
    expect(db.inserts).toHaveLength(0);
  });

  test("replaces public documents idempotently by skill id", async () => {
    const db = createInsertDb();

    await expect(
      replaceSkillSearchDocument(
        {
          authorHandle: "acme",
          body: "body",
          contentHash: "hash-1",
          description: "Description",
          isPublic: true,
          repository: "skills",
          skillId: "skill-1" as never,
          slug: "workflow",
          snapshotId: "snapshot-1" as never,
          title: "Workflow",
        },
        db as never,
      ),
    ).resolves.toEqual({ indexingStatus: "indexed", status: "replaced" });

    expect(db.inserts).toHaveLength(1);
    expect(db.conflictUpdates).toEqual([
      expect.objectContaining({
        set: expect.objectContaining({
          contentHash: "hash-1",
          skillId: "skill-1",
          snapshotId: "snapshot-1",
        }),
      }),
    ]);
  });

  test("skips stale writers when the skill latest snapshot changed", async () => {
    const db = createInsertDb({
      latestSnapshotId: "snapshot-current",
      visibility: "public",
    });

    await expect(
      replaceSkillSearchDocument(
        {
          authorHandle: "acme",
          body: "body",
          contentHash: "hash-1",
          description: "Description",
          isPublic: true,
          repository: "skills",
          skillId: "skill-1" as never,
          slug: "workflow",
          snapshotId: "snapshot-old" as never,
          title: "Workflow",
        },
        db as never,
      ),
    ).resolves.toEqual({ status: "skipped-stale" });

    expect(db.deletes).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  test("deletes the document when database visibility is no longer public", async () => {
    const db = createInsertDb({
      latestSnapshotId: "snapshot-1",
      visibility: "private",
    });

    await expect(
      replaceSkillSearchDocument(
        {
          authorHandle: "acme",
          body: "body",
          contentHash: "hash-1",
          description: "Description",
          isPublic: true,
          repository: "skills",
          skillId: "skill-1" as never,
          slug: "workflow",
          snapshotId: "snapshot-1" as never,
          title: "Workflow",
        },
        db as never,
      ),
    ).resolves.toEqual({ status: "deleted" });

    expect(db.deletes).toHaveLength(1);
    expect(db.inserts).toHaveLength(0);
  });

  test("refreshes metadata without replacing indexed body fields", async () => {
    const db = createMetadataRefreshDb({
      authorHandle: "acme",
      description: "Updated description",
      latestSnapshotId: "snapshot-1",
      repository: "skills",
      slug: "updated",
      tags: "automation,search",
      title: "Updated",
      visibility: "public",
    });

    await expect(
      refreshSkillSearchDocumentMetadata("skill-1" as never, db as never),
    ).resolves.toEqual({ status: "refreshed" });

    expect(db.deletes).toHaveLength(0);
    expect(db.updates).toEqual([
      {
        authorHandle: "acme",
        description: "Updated description",
        repository: "skills",
        slug: "updated",
        tags: "automation search",
        title: "Updated",
        updatedAt: expect.any(Number),
      },
    ]);
  });

  test("deletes metadata documents that are no longer public", async () => {
    const db = createMetadataRefreshDb({
      authorHandle: "acme",
      description: "Updated description",
      latestSnapshotId: "snapshot-1",
      repository: "skills",
      slug: "updated",
      tags: "automation,search",
      title: "Updated",
      visibility: "private",
    });

    await expect(
      refreshSkillSearchDocumentMetadata("skill-1" as never, db as never),
    ).resolves.toEqual({ status: "deleted" });

    expect(db.deletes).toHaveLength(1);
    expect(db.updates).toHaveLength(0);
  });

  test("refreshes all public search document metadata for a repo", async () => {
    const db = createRepoMetadataRefreshDb();

    await expect(
      refreshRepoSkillSearchDocumentMetadata("acme/skills", db as never),
    ).resolves.toEqual({
      deletedCount: 0,
      refreshedCount: 2,
    });

    expect(db.updatedSkillIds).toHaveLength(2);
  });
});
