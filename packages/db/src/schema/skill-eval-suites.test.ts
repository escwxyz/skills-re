/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { skillEvalCasesTable, skillEvalSuitesTable } from "./skill-eval-suites";

const getExtraConfigNames = (table: object) => {
  const builderKey = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  expect(builderKey).toBeDefined();

  const builders = (
    (table as unknown as Record<symbol, unknown>)[builderKey as symbol] as (
      table: object,
    ) => unknown[]
  )(table);

  return builders
    .map((item) => {
      const typedItem = item as { name?: string; config?: { name?: string } };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("skill eval suite schema", () => {
  test("exports suite columns needed for snapshot-scoped discovery", () => {
    expect(skillEvalSuitesTable.id.name).toBe("id");
    expect(skillEvalSuitesTable.skillId.name).toBe("skill_id");
    expect(skillEvalSuitesTable.snapshotId.name).toBe("snapshot_id");
    expect(skillEvalSuitesTable.evalPath.name).toBe("eval_path");
    expect(skillEvalSuitesTable.fingerprint.name).toBe("fingerprint");
    expect(skillEvalSuitesTable.caseCount.name).toBe("case_count");
    expect(skillEvalSuitesTable.status.name).toBe("status");
    expect(skillEvalSuitesTable.validationErrorsJson.name).toBe("validation_errors_json");
    expect(skillEvalSuitesTable.syncTime.name).toBe("sync_time");
  });

  test("exports suite lookup indexes", () => {
    const names = getExtraConfigNames(skillEvalSuitesTable);
    expect(names).toContain("skill_eval_suites_skill_snapshot_idx");
    expect(names).toContain("skill_eval_suites_status_sync_time_idx");
    expect(names).toContain("skill_eval_suites_snapshot_eval_path_fingerprint_unique");
  });

  test("exports case columns needed for normalized eval cases", () => {
    expect(skillEvalCasesTable.id.name).toBe("id");
    expect(skillEvalCasesTable.suiteId.name).toBe("suite_id");
    expect(skillEvalCasesTable.skillId.name).toBe("skill_id");
    expect(skillEvalCasesTable.snapshotId.name).toBe("snapshot_id");
    expect(skillEvalCasesTable.caseId.name).toBe("case_id");
    expect(skillEvalCasesTable.prompt.name).toBe("prompt");
    expect(skillEvalCasesTable.expectedOutput.name).toBe("expected_output");
    expect(skillEvalCasesTable.fixturePathsJson.name).toBe("fixture_paths_json");
    expect(skillEvalCasesTable.assertionsJson.name).toBe("assertions_json");
    expect(skillEvalCasesTable.fingerprint.name).toBe("fingerprint");
    expect(skillEvalCasesTable.sortOrder.name).toBe("sort_order");
  });

  test("exports case lookup indexes", () => {
    const names = getExtraConfigNames(skillEvalCasesTable);
    expect(names).toContain("skill_eval_cases_suite_sort_order_idx");
    expect(names).toContain("skill_eval_cases_skill_snapshot_idx");
    expect(names).toContain("skill_eval_cases_suite_case_id_unique");
  });
});
