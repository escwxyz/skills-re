/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { changelogSchema, listChangelogsInputSchema } from "./common/changelog";
import { changelogsContract } from "./changelogs";

describe("changelogs contract", () => {
  test("accepts a changelog payload", () => {
    expect(
      changelogSchema.parse({
        changes: ["Added x"],
        createdAt: 123,
        description: "Release notes",
        id: "changelog-1",
        isPublished: true,
        isStable: true,
        title: "v1.0.0",
        type: "feature",
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
      }),
    ).toEqual({
      changes: ["Added x"],
      createdAt: 123,
      description: "Release notes",
      id: "changelog-1",
      isPublished: true,
      isStable: true,
      title: "v1.0.0",
      type: "feature",
      versionMajor: 1,
      versionMinor: 0,
      versionPatch: 0,
    });
  });

  test("accepts the changelog list input payload", () => {
    expect(listChangelogsInputSchema.parse({ limit: 10 })).toEqual({ limit: 10 });
  });

  test("exposes the legacy changelog routes", () => {
    expect(changelogsContract.list).toBeDefined();
    expect(changelogsContract.listAdmin).toBeDefined();
    expect(changelogsContract.getById).toBeDefined();
    expect(changelogsContract.upsert).toBeDefined();
    expect(changelogsContract.remove).toBeDefined();
  });
});
