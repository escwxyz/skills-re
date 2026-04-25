/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  collectionsContract,
  collectionsListInputSchema,
  setCollectionSkillsInputSchema,
} from "./collections";

describe("collections contract", () => {
  test("rejects duplicate skill ids in set skills input", () => {
    expect(() =>
      setCollectionSkillsInputSchema.parse({
        collectionId: "collection-1",
        skillIds: ["skill-1", "skill-1"],
      }),
    ).toThrow("skillIds must be unique.");
  });

  test("accepts an optional bounded limit for collections list input", () => {
    expect(collectionsListInputSchema.safeParse({}).success).toBe(true);
    expect(collectionsListInputSchema.parse({ cursor: "cursor-1", limit: 100 })).toEqual({
      cursor: "cursor-1",
      limit: 100,
    });
    expect(() => collectionsListInputSchema.parse({ limit: 101 })).toThrow();
  });

  test("exposes the collection routes used by the API layer", () => {
    expect(collectionsContract.count).toBeDefined();
    expect(collectionsContract.getBySlug).toBeDefined();
    expect(collectionsContract.list).toBeDefined();
    expect(collectionsContract.create).toBeDefined();
    expect(collectionsContract.update).toBeDefined();
    expect(collectionsContract.delete).toBeDefined();
    expect(collectionsContract.addSkill).toBeDefined();
    expect(collectionsContract.removeSkill).toBeDefined();
    expect(collectionsContract.setSkills).toBeDefined();
  });
});
