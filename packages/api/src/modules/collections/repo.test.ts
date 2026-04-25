/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asCollectionId, asSkillId } from "@skills-re/db/utils";

import { replaceCollectionSkills } from "./repo";
import { decodeCollectionCursor, encodeCollectionCursor } from "./cursor";

describe("collections repo", () => {
  test("encodes and decodes collection cursors", () => {
    const encoded = encodeCollectionCursor({ id: "collection-1", title: "Alpha" });

    expect(decodeCollectionCursor(encoded)).toEqual({
      id: "collection-1",
      title: "Alpha",
    });
    expect(decodeCollectionCursor("not-a-cursor")).toBeNull();
  });

  test("replaces collection skills in a single transaction", async () => {
    const operations: string[] = [];
    const tx = {
      delete: () => ({
        where: () => {
          operations.push("delete");
          return Promise.resolve();
        },
      }),
      insert: () => ({
        values: (value: unknown) => {
          operations.push(`insert:${JSON.stringify(value)}`);
          return Promise.resolve();
        },
      }),
    };
    const database = {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      transaction: async (callback: (trx: typeof tx) => Promise<void>) => {
        operations.push("begin");
        // oxlint-disable-next-line promise/prefer-await-to-callbacks
        await callback(tx);
        operations.push("commit");
      },
    };

    await replaceCollectionSkills(
      {
        collectionId: asCollectionId("collection-1"),
        skillIds: [asSkillId("skill-1"), asSkillId("skill-2")],
      },
      database as never,
    );

    expect(operations).toEqual([
      "begin",
      "delete",
      'insert:[{"collectionId":"collection-1","skillId":"skill-1","position":0},{"collectionId":"collection-1","skillId":"skill-2","position":1}]',
      "commit",
    ]);
  });

  test("propagates insert failures so the transaction can roll back", async () => {
    const rollbackError = new Error("collections_skills_unique");
    const operations: string[] = [];
    const tx = {
      delete: () => ({
        where: () => {
          operations.push("delete");
          return Promise.resolve();
        },
      }),
      insert: () => ({
        values: () => {
          operations.push("insert");
          return Promise.reject(rollbackError);
        },
      }),
    };
    const database = {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      transaction: async (callback: (trx: typeof tx) => Promise<void>) => {
        operations.push("begin");
        try {
          // oxlint-disable-next-line promise/prefer-await-to-callbacks
          await callback(tx);
        } catch (error) {
          operations.push("rollback");
          throw error;
        }
      },
    };

    await expect(
      replaceCollectionSkills(
        {
          collectionId: asCollectionId("collection-1"),
          skillIds: [asSkillId("skill-1"), asSkillId("skill-1")],
        },
        database as never,
      ),
    ).rejects.toBe(rollbackError);

    expect(operations).toEqual(["begin", "delete", "insert", "rollback"]);
  });
});
