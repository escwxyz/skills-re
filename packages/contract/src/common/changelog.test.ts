/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { changelogSchema, listChangelogsInputSchema } from "./changelog";

describe("common changelog schemas", () => {
  test("parse the shared changelog request and response shapes", () => {
    expect(listChangelogsInputSchema.parse({ limit: 10 })).toEqual({
      limit: 10,
    });

    expect(
      changelogSchema.parse({
        changes: ["Added snapshots migration"],
        createdAt: 1,
        description: "Migrate the backend foundation",
        id: "clg_1",
        isPublished: true,
        isStable: false,
        title: "Foundation migration",
        type: "feature",
        versionMajor: 1,
        versionMinor: 2,
        versionPatch: 3,
      }),
    ).toEqual({
      changes: ["Added snapshots migration"],
      createdAt: 1,
      description: "Migrate the backend foundation",
      id: "clg_1",
      isPublished: true,
      isStable: false,
      title: "Foundation migration",
      type: "feature",
      versionMajor: 1,
      versionMinor: 2,
      versionPatch: 3,
    });
  });
});
