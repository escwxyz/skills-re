/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSnapshotId, asStaticAuditId } from "@skills-re/db/utils";

import { createStaticAuditsService } from "./service";

describe("static audits service", () => {
  test("maps the latest audit row into the public report shape", async () => {
    const service = createStaticAuditsService({
      getLatestStaticAuditBySnapshot: async (_snapshotId: string, _database?: unknown) => ({
        auditJson: JSON.stringify({
          evaluation: {
            is_blocked: false,
            overall_score: 92,
            risk_level: "low",
            safe_to_publish: true,
            status: "pass",
          },
          meta: {
            generated_at: "2024-01-01T00:00:00.000Z",
            pipeline: "test-pipeline",
            pipeline_run_id: "run-1",
            rules_version: "1",
            source_hash: "abc",
            source_type: "github",
          },
          provider: {
            name: "skill-scanner",
            summary: {
              findings_count: 1,
              highest_severity: "low",
            },
          },
          security_audit: {
            files_scanned: 4,
            findings: [
              {
                category: "execution",
                confidence: 0.4,
                evidence: "evidence",
                location: {
                  path: "skill.md",
                  startLine: 1,
                },
                message: "message",
                rule_id: "rule-1",
                severity: "low",
                source: "rule",
              },
            ],
            risk_factors: ["factor"],
            summary: "summary",
            total_lines: 123,
          },
          target: {
            owner: "acme",
            repo: "skills",
          },
        }),
        findingsJson: JSON.stringify([
          {
            category: "execution",
            confidence: 0.4,
            evidence: "evidence",
            location: {
              path: "skill.md",
              startLine: 1,
            },
            message: "message",
            rule_id: "rule-1",
            severity: "low",
            source: "rule",
          },
        ]),
        filesScanned: 4,
        generatedAt: 1704067200000,
        id: asStaticAuditId("audit-1"),
        isBlocked: false,
        modelVersion: null,
        overallScore: 92,
        reportR2Key: null,
        riskLevel: "low",
        safeToPublish: true,
        status: "pass",
        summary: "summary",
        syncTime: 1704067200000,
        totalLines: 123,
      }),
    });

    await expect(service.getReportBySnapshot("snapshot-1")).resolves.toEqual({
      auditId: "audit-1",
      findings: [
        {
          category: "execution",
          confidence: 0.4,
          evidence: "evidence",
          location: {
            path: "skill.md",
            startLine: 1,
          },
          message: "message",
          rule_id: "rule-1",
          severity: "low",
          source: "rule",
        },
      ],
      generatedAt: "2024-01-01T00:00:00.000Z",
      isBlocked: false,
      overallScore: 92,
      reportMarkdown: undefined,
      reportR2Key: undefined,
      riskLevel: "low",
      safeToPublish: true,
      scanner: {
        filesScanned: 4,
        findingsCount: 1,
        highestSeverity: "low",
        llmProvider: undefined,
        model: undefined,
        policy: undefined,
        providerName: "skill-scanner",
        scannerVersion: undefined,
        totalLines: 123,
      },
      status: "pass",
      summary: "summary",
      syncTime: 1704067200000,
    });
  });

  test("dispatches a batch of missing static audits", async () => {
    const originalNow = Date.now;
    Date.now = () => 0;

    try {
      const countCalls: Array<{ maxSyncTime?: number }> = [];
      const listCalls: Array<{
        limit: number;
        maxSyncTime?: number;
        offset?: number;
      }> = [];
      const dispatchCalls: Array<
        {
          owner: string;
          repo: string;
          snapshotId?: string;
          skillRootPath?: string;
          sourceCommitSha?: string;
          sourceRef?: string;
        }[]
      > = [];

      const service = createStaticAuditsService({
        countSnapshotsMissingStaticAudits: async (input) => {
          countCalls.push(input ?? {});
          return 3;
        },
        dispatchStaticAuditWorkflow: async (targets) => {
          dispatchCalls.push(targets);
          return {
            dispatched: true as const,
            repository: "acme/skills-audit",
            workflowFile: "skill-audit-submit.yml",
          };
        },
        listSnapshotsMissingStaticAudits: async (input) => {
          listCalls.push(input);
        return [
          {
            owner: "acme",
            repo: "skills",
            skillRootPath: "tools/formatter",
            snapshotId: asSnapshotId("snapshot-1"),
            sourceCommitSha: "commit-1",
            syncTime: 1000,
          },
          {
            owner: "acme",
            repo: "skills",
            skillRootPath: "tools/linter",
            snapshotId: asSnapshotId("snapshot-2"),
            sourceCommitSha: "commit-2",
            syncTime: 2000,
          },
          ];
        },
      });

      await expect(
        service.dispatchMissingSnapshotAuditsBatch({
          batchSize: 2,
          minSnapshotAgeMs: 6000,
        }),
      ).resolves.toEqual({
        batchSize: 2,
        dispatchReason: undefined,
        dispatched: true,
        eligibleCount: 3,
        minSnapshotAgeMs: 6000,
        offset: 0,
        pageCount: 2,
        repository: "acme/skills-audit",
        selectedCount: 2,
        skippedMissingCommitShaCount: 0,
        targetSnapshotIds: [asSnapshotId("snapshot-1"), asSnapshotId("snapshot-2")],
        workflowFile: "skill-audit-submit.yml",
      });

      expect(countCalls).toEqual([{ maxSyncTime: -6000 }]);
      expect(listCalls).toEqual([
        {
          limit: 2,
          maxSyncTime: -6000,
          offset: 0,
        },
      ]);
      expect(dispatchCalls).toEqual([
        [
          {
            owner: "acme",
            repo: "skills",
            skillRootPath: "tools/formatter",
            snapshotId: asSnapshotId("snapshot-1"),
            sourceCommitSha: "commit-1",
          },
          {
            owner: "acme",
            repo: "skills",
            skillRootPath: "tools/linter",
            snapshotId: asSnapshotId("snapshot-2"),
            sourceCommitSha: "commit-2",
          },
        ],
      ]);
    } finally {
      Date.now = originalNow;
    }
  });

  test("returns no-targets when there are no eligible snapshots", async () => {
    const dispatchCalls: Array<
      {
        owner: string;
        repo: string;
        snapshotId?: string;
        skillRootPath?: string;
        sourceCommitSha?: string;
        sourceRef?: string;
      }[]
    > = [];

    const service = createStaticAuditsService({
      countSnapshotsMissingStaticAudits: async () => 0,
      dispatchStaticAuditWorkflow: async (targets) => {
        dispatchCalls.push(targets);
        return {
          dispatched: false as const,
          reason: "no-targets",
        };
      },
      listSnapshotsMissingStaticAudits: async () => [],
    });

    await expect(
      service.dispatchMissingSnapshotAuditsBatch({
        batchSize: 10,
        minSnapshotAgeMs: 6000,
      }),
    ).resolves.toEqual({
      batchSize: 10,
      dispatchReason: "no-targets",
      dispatched: false,
      eligibleCount: 0,
      minSnapshotAgeMs: 6000,
      offset: 0,
      pageCount: 0,
      repository: undefined,
      selectedCount: 0,
      skippedMissingCommitShaCount: 0,
      targetSnapshotIds: [],
      workflowFile: undefined,
    });

    expect(dispatchCalls).toEqual([[]]);
  });
});
