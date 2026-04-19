/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { authorHandleInputSchema, skillSlugInputSchema } from "./slugs";
import { snapshotFileEntrySchema } from "./snapshots";

describe("common legacy shapes", () => {
  test("parse the remaining legacy input and snapshot entry shapes", () => {
    expect(skillSlugInputSchema.parse({ slug: "example-skill" })).toEqual({
      slug: "example-skill",
    });

    expect(authorHandleInputSchema.parse({ handle: "example" })).toEqual({
      handle: "example",
    });

    expect(
      snapshotFileEntrySchema.parse({
        contentType: "text/plain",
        fileHash: "hash-1",
        r2Key: "snapshots/hash-1",
        size: 12,
      }),
    ).toEqual({
      contentType: "text/plain",
      fileHash: "hash-1",
      r2Key: "snapshots/hash-1",
      size: 12,
    });
  });
});
