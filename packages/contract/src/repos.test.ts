/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reposContract } from "./repos";
import {
  repoDuplicateInputSchema,
  repoDuplicateResultSchema,
  repoListItemSchema,
  repoStatsSyncResultSchema,
  repoStatsUpdateInputSchema,
} from "./common/content";

describe("repos contract", () => {
  test("accepts a directory-path-aware duplicate check request", () => {
    expect(
      repoDuplicateInputSchema.parse({
        directoryPath: "skills/example",
        repoName: "example-repo",
        repoOwner: "example",
      }),
    ).toEqual({
      directoryPath: "skills/example",
      repoName: "example-repo",
      repoOwner: "example",
    });
  });

  test("accepts a repository list item payload", () => {
    expect(
      repoListItemSchema.parse({
        nameWithOwner: "example/example-repo",
        repoName: "example-repo",
        repoOwner: "example",
      }),
    ).toEqual({
      nameWithOwner: "example/example-repo",
      repoName: "example-repo",
      repoOwner: "example",
    });
  });

  test("keeps the duplicate result shape stable", () => {
    expect(repoDuplicateResultSchema.parse({ duplicated: true, reason: "path" })).toEqual({
      duplicated: true,
      reason: "path",
    });
  });

  test("accepts a repository stats update payload", () => {
    expect(
      repoStatsUpdateInputSchema.parse({
        forks: 3,
        nameWithOwner: "example/example-repo",
        stars: 8,
        updatedAt: 1_717_011_200_000,
      }),
    ).toEqual({
      forks: 3,
      nameWithOwner: "example/example-repo",
      stars: 8,
      updatedAt: 1_717_011_200_000,
    });
  });

  test("keeps the repository stats sync result stable", () => {
    expect(
      repoStatsSyncResultSchema.parse({
        changed: [],
        continueCursor: "",
        isDone: true,
      }),
    ).toEqual({
      changed: [],
      continueCursor: "",
      isDone: true,
    });
  });

  test("exposes the repos routes used by the API layer", () => {
    expect(reposContract.checkDuplicated).toBeDefined();
    expect(reposContract.checkExisting).toBeDefined();
    expect(reposContract.listPage).toBeDefined();
    expect(reposContract.updateStats).toBeDefined();
    expect(reposContract.syncStats).toBeDefined();
    expect(reposContract.enqueueRepoStatsSync).toBeDefined();
  });
});
