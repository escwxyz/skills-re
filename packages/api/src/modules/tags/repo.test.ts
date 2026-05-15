/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSkillId, asTagId } from "@skills-re/db/utils";

import { addSkillTagLinks } from "./repo";

describe("tags repo", () => {
  test("chunks skill tag link inserts to stay under D1 parameter limits", async () => {
    const batches: unknown[][] = [];
    const database = {
      insert: () => ({
        values: (value: unknown[]) => {
          batches.push(value);
          return Promise.resolve();
        },
      }),
    };

    await addSkillTagLinks(
      {
        skillId: asSkillId("skill-1"),
        tagIds: Array.from({ length: 34 }, (_, index) => asTagId(`tag-${index + 1}`)),
      },
      database as never,
    );

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(33);
    expect(batches[1]).toHaveLength(1);
    expect(batches[0][0]).toMatchObject({
      createdAt: expect.any(Number),
      skillId: "skill-1",
      tagId: "tag-1",
    });
  });
});
