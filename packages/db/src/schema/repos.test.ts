/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reposRelations, reposTable } from "./repos";

describe("repo schema", () => {
  test("exports the defaultBranch column on the repos table", () => {
    expect(reposTable.defaultBranch).toBeDefined();
  });

  test("exports the repo relations", () => {
    expect(reposRelations).toBeDefined();
  });
});
