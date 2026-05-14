// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asStaticAuditId } from "@skills-re/db/utils";

import { createStaticAuditIngestResponse } from "./static-audits-ingest";

const buildReport = () => ({
  evaluation: {
    is_blocked: false,
    overall_score: 91,
    risk_level: "low",
    safe_to_publish: true,
    status: "pass",
  },
  meta: {
    generated_at: "2024-01-01T00:00:00.000Z",
    pipeline: "github-actions-submit",
    pipeline_run_id: "run-1",
    rules_version: "static-rules-v1",
    source_hash: "hash-1",
    source_ref: "main",
    source_type: "github",
  },
  security_audit: {
    files_scanned: 3,
    findings: [],
    risk_factors: [],
    summary: "No findings",
    total_lines: 42,
  },
  target: {
    owner: "acme",
    repo: "skills",
    snapshot_id: "snapshot-1",
    skill_root_path: "skills/acme/widget",
  },
});

describe("createStaticAuditIngestResponse", () => {
  test("rejects missing automation tokens", async () => {
    const response = await createStaticAuditIngestResponse(
      new Request("https://example.com/skills/audits/ingest", {
        method: "POST",
      }),
      "expected-token",
    );

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toContain("Missing or invalid automation token.");
  });

  test("ingests a valid audit payload", async () => {
    const response = await createStaticAuditIngestResponse(
      new Request("https://example.com/skills/audits/ingest", {
        body: JSON.stringify(buildReport()),
        headers: {
          "content-type": "application/json",
          "x-skills-automation-token": "expected-token",
        },
        method: "POST",
      }),
      "expected-token",
      {
        staticAuditsService: {
          ingest: async () => ({
            auditId: asStaticAuditId("audit-1"),
            reason: undefined,
            status: "pass",
            upserted: true,
          }),
        } as never,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      auditId: asStaticAuditId("audit-1"),
      reason: undefined,
      status: "pass",
      upserted: true,
    });
  });
});
