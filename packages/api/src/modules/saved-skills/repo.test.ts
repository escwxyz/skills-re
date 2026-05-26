/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { collectionsSkillsTable, collectionsTable, savedSkillsTable } from "@skills-re/db/schema";
import { asSkillId, asUserId } from "@skills-re/db/utils";

import { deleteSavedSkill, insertSavedSkill } from "./repo";

const tableName = (table: unknown) => {
  if (table === collectionsTable) {
    return "collections";
  }
  if (table === collectionsSkillsTable) {
    return "collections_skills";
  }
  if (table === savedSkillsTable) {
    return "saved_skills";
  }
  return "unknown";
};

describe("saved skills repo", () => {
  test("inserts saved skills into the user's default collection membership", async () => {
    const operations: Array<{ op: string; table?: string; value?: unknown }> = [];
    let defaultCollectionSelected = false;
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              operations.push({ op: "select-default" });
              if (defaultCollectionSelected) {
                return Promise.resolve([{ id: "collection-1" }]);
              }
              defaultCollectionSelected = true;
              return Promise.resolve([{ id: "collection-1" }]);
            },
          }),
        }),
      }),
      insert: (table: unknown) => ({
        values: (value: unknown) => {
          operations.push({ op: "insert", table: tableName(table), value });
          return {
            onConflictDoNothing: () => ({
              returning: () =>
                Promise.resolve([
                  {
                    createdAt: new Date(123),
                    id: "collection-skill-1",
                  },
                ]),
            }),
          };
        },
      }),
      transaction: async (callback: (tx: unknown) => Promise<unknown>) => await callback(database),
    };

    await expect(
      insertSavedSkill(
        {
          skillId: asSkillId("skill-1"),
          userId: asUserId("user-1"),
        },
        database as never,
      ),
    ).resolves.toEqual({
      createdAt: new Date(123),
      id: "collection-skill-1",
    });

    expect(operations).toEqual([
      { op: "select-default" },
      {
        op: "insert",
        table: "collections_skills",
        value: {
          collectionId: "collection-1",
          id: expect.any(String),
          skillId: "skill-1",
        },
      },
    ]);
  });

  test("unsaving removes only default collection membership", async () => {
    const operations: Array<{ op: string; table?: string }> = [];
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              operations.push({ op: "select-default" });
              return Promise.resolve([{ id: "collection-1" }]);
            },
          }),
        }),
      }),
      delete: (table: unknown) => {
        operations.push({ op: "delete", table: tableName(table) });
        return {
          where: () => Promise.resolve(),
        };
      },
    };

    await deleteSavedSkill(
      {
        skillId: asSkillId("skill-1"),
        userId: asUserId("user-1"),
      },
      database as never,
    );

    expect(operations).toEqual([
      { op: "select-default" },
      { op: "delete", table: "collections_skills" },
    ]);
  });
});
