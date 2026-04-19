/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createChangelogsService } from "./service";

describe("changelogs service", () => {
  test("lists published changelogs with the default limit", async () => {
    const calls: { limit?: number }[] = [];
    const service = createChangelogsService({
      listPublishedChangelogs: async (limit) => {
        calls.push({ limit });
        return [
          {
            changesJson: ["Added x"],
            createdAt: 123,
            description: "Release notes",
            id: "changelog-1",
            isPublished: true,
            isStable: true,
            title: "v1.0.0",
            type: "feature" as const,
            versionMajor: 1,
            versionMinor: 0,
            versionPatch: 0,
          },
        ];
      },
    });

    await expect(service.listPublished()).resolves.toEqual([
      {
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
      },
    ]);
    expect(calls).toEqual([{ limit: 20 }]);
  });

  test("rejects changelog version conflicts", async () => {
    const service = createChangelogsService({
      hasVersionTripletConflict: async () => true,
    });

    await expect(
      service.upsert({
        changes: ["Added x"],
        description: "Release notes",
        title: "v1.0.0",
        type: "feature",
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
      }),
    ).rejects.toThrow("Version already exists.");
  });

  test("creates a changelog with default publication flags", async () => {
    const calls: {
      changesJson: string[];
      description: string;
      isPublished: boolean;
      isStable: boolean;
      title: string;
      type: "feature" | "patch" | "major";
      versionMajor: number;
      versionMinor: number;
      versionPatch: number;
    }[] = [];
    const service = createChangelogsService({
      createChangelog: async (input) => {
        calls.push(input);
        return "changelog-1";
      },
      hasVersionTripletConflict: async () => false,
    });

    await expect(
      service.upsert({
        changes: ["Added x"],
        description: "Release notes",
        title: "v1.0.0",
        type: "feature",
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
      }),
    ).resolves.toEqual({ id: "changelog-1" });
    expect(calls).toEqual([
      {
        changesJson: ["Added x"],
        description: "Release notes",
        isPublished: true,
        isStable: true,
        title: "v1.0.0",
        type: "feature",
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
      },
    ]);
  });
});
