/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { skillEvalCaseResultsTable, skillEvalRunsTable } from "./skill-eval-runs";

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

describe("skill eval runs schema", () => {
  test("exports run identity and status columns", () => {
    expect(skillEvalRunsTable.id.name).toBe("id");
    expect(skillEvalRunsTable.skillId.name).toBe("skill_id");
    expect(skillEvalRunsTable.snapshotId.name).toBe("snapshot_id");
    expect(skillEvalRunsTable.suiteId.name).toBe("suite_id");
    expect(skillEvalRunsTable.agentId.name).toBe("agent_id");
    expect(skillEvalRunsTable.createdBy.name).toBe("created_by");
    expect(skillEvalRunsTable.status.name).toBe("status");
  });

  test("exports immutable execution snapshot columns", () => {
    expect(skillEvalRunsTable.policyVersion.name).toBe("policy_version");
    expect(skillEvalRunsTable.limitsJson.name).toBe("limits_json");
    expect(skillEvalRunsTable.networkJson.name).toBe("network_json");
    expect(skillEvalRunsTable.artifactPrefix.name).toBe("artifact_prefix");
    expect(skillEvalRunsTable.idempotencyKey.name).toBe("idempotency_key");
  });

  test("exports aggregate summary and metering columns", () => {
    expect(skillEvalRunsTable.totalCases.name).toBe("total_cases");
    expect(skillEvalRunsTable.passedCases.name).toBe("passed_cases");
    expect(skillEvalRunsTable.failedCases.name).toBe("failed_cases");
    expect(skillEvalRunsTable.blockedCases.name).toBe("blocked_cases");
    expect(skillEvalRunsTable.totalDurationMs.name).toBe("total_duration_ms");
    expect(skillEvalRunsTable.tokenCount.name).toBe("token_count");
    expect(skillEvalRunsTable.costMicros.name).toBe("cost_micros");
    expect(skillEvalRunsTable.syncTime.name).toBe("sync_time");
  });

  test("exports run query indexes", () => {
    const names = getExtraConfigNames(skillEvalRunsTable);
    expect(names).toContain("skill_eval_runs_skill_sync_time_idx");
    expect(names).toContain("skill_eval_runs_snapshot_sync_time_idx");
    expect(names).toContain("skill_eval_runs_status_sync_time_idx");
    expect(names).toContain("skill_eval_runs_created_by_sync_time_idx");
    expect(names).toContain("skill_eval_runs_idempotency_key_unique");
  });

  test("keeps run terminal statuses explicit", () => {
    expect(skillEvalRunsTable.status.enumValues).toEqual([
      "pending",
      "queued",
      "running",
      "pass",
      "fail",
      "blocked",
      "cancelled",
    ]);
    expect(skillEvalRunsTable.status.default).toBe("pending");
  });

  test("exports case result identity and status columns", () => {
    expect(skillEvalCaseResultsTable.id.name).toBe("id");
    expect(skillEvalCaseResultsTable.runId.name).toBe("run_id");
    expect(skillEvalCaseResultsTable.caseId.name).toBe("case_id");
    expect(skillEvalCaseResultsTable.status.name).toBe("status");
    expect(skillEvalCaseResultsTable.summary.name).toBe("summary");
    expect(skillEvalCaseResultsTable.errorCode.name).toBe("error_code");
    expect(skillEvalCaseResultsTable.errorMessage.name).toBe("error_message");
  });

  test("exports with-skill and baseline result columns", () => {
    expect(skillEvalCaseResultsTable.withSkillStatus.name).toBe("with_skill_status");
    expect(skillEvalCaseResultsTable.withSkillOutputPreview.name).toBe("with_skill_output_preview");
    expect(skillEvalCaseResultsTable.withSkillArtifactsJson.name).toBe("with_skill_artifacts_json");
    expect(skillEvalCaseResultsTable.withSkillDurationMs.name).toBe("with_skill_duration_ms");
    expect(skillEvalCaseResultsTable.withSkillScore.name).toBe("with_skill_score");
    expect(skillEvalCaseResultsTable.baselineStatus.name).toBe("baseline_status");
    expect(skillEvalCaseResultsTable.baselineOutputPreview.name).toBe("baseline_output_preview");
    expect(skillEvalCaseResultsTable.baselineArtifactsJson.name).toBe("baseline_artifacts_json");
    expect(skillEvalCaseResultsTable.baselineDurationMs.name).toBe("baseline_duration_ms");
    expect(skillEvalCaseResultsTable.baselineScore.name).toBe("baseline_score");
    expect(skillEvalCaseResultsTable.assertionSummaryJson.name).toBe("assertion_summary_json");
  });

  test("exports case result query indexes", () => {
    const names = getExtraConfigNames(skillEvalCaseResultsTable);
    expect(names).toContain("skill_eval_case_results_run_status_idx");
    expect(names).toContain("skill_eval_case_results_case_idx");
    expect(names).toContain("skill_eval_case_results_run_case_unique");
  });

  test("keeps case result terminal statuses explicit", () => {
    expect(skillEvalCaseResultsTable.status.enumValues).toEqual([
      "pending",
      "running",
      "pass",
      "fail",
      "blocked",
    ]);
    expect(skillEvalCaseResultsTable.withSkillStatus.enumValues).toEqual([
      "pending",
      "running",
      "pass",
      "fail",
      "blocked",
    ]);
    expect(skillEvalCaseResultsTable.status.default).toBe("pending");
  });
});
