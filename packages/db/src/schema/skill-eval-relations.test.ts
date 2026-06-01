/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  sandboxAgentsRelations,
  skillEvalCaseResultsRelations,
  skillEvalCasesRelations,
  skillEvalRunsRelations,
  skillEvalSuitesRelations,
} from "./relations";
import {
  sandboxAgentsTable,
  skillEvalCaseResultsTable,
  skillEvalCasesTable,
  skillEvalRunsTable,
  skillEvalSuitesTable,
} from "./index";

describe("skill eval schema exports and relations", () => {
  test("exports all skill eval tables from schema index", () => {
    expect(sandboxAgentsTable).toBeDefined();
    expect(skillEvalSuitesTable).toBeDefined();
    expect(skillEvalCasesTable).toBeDefined();
    expect(skillEvalRunsTable).toBeDefined();
    expect(skillEvalCaseResultsTable).toBeDefined();
  });

  test("exports all skill eval relation containers", () => {
    expect(sandboxAgentsRelations).toBeDefined();
    expect(skillEvalSuitesRelations).toBeDefined();
    expect(skillEvalCasesRelations).toBeDefined();
    expect(skillEvalRunsRelations).toBeDefined();
    expect(skillEvalCaseResultsRelations).toBeDefined();
  });
});
