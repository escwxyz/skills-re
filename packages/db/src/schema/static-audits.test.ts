/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { staticAuditsTable } from "./static-audits";
import { staticAuditsRelations } from "./relations";

describe("static audits schema", () => {
  test("exports the expected core columns", () => {
    expect(staticAuditsTable.id.name).toBe("id");
    expect(staticAuditsTable.snapshotId.name).toBe("snapshot_id");
    expect(staticAuditsTable.auditJson.name).toBe("audit_json");
    expect(staticAuditsTable.findingsJson.name).toBe("findings_json");
    expect(staticAuditsTable.generatedAt.name).toBe("generated_at");
    expect(staticAuditsTable.syncTime.name).toBe("sync_time");
    expect(staticAuditsTable.status.name).toBe("status");
    expect(staticAuditsTable.summary.name).toBe("summary");
  });

  test("exports the relation container and legacy checks", () => {
    expect(staticAuditsRelations).toBeDefined();

    const builderKey = Object.getOwnPropertySymbols(staticAuditsTable).find((symbol) =>
      String(symbol).includes("ExtraConfigBuilder"),
    );
    expect(builderKey).toBeDefined();
    const builders = (
      (staticAuditsTable as Record<symbol, unknown>)[builderKey as symbol] as (
        table: object,
      ) => unknown[]
    )(staticAuditsTable);
    const names = builders
      .map((item) => {
        const typedItem = item as { name?: string; config?: { name?: string } };
        return typedItem.name ?? typedItem.config?.name;
      })
      .filter((name): name is string => typeof name === "string");

    expect(names).toContain("static_audits_overall_score_range");
    expect(names).toContain("static_audits_files_scanned_non_negative");
    expect(names).toContain("static_audits_total_lines_non_negative");
    expect(names).toContain("static_audits_generated_at_non_negative");
    expect(names).toContain("static_audits_sync_time_non_negative");
  });
});
