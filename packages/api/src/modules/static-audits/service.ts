import { createHash } from "node:crypto";

import { staticAuditReportSchema } from "@skills-re/contract/static-audits";
import type { StaticAuditReport } from "@skills-re/contract/static-audits";

import type {
  findStaticAuditByIdempotencyKey,
  getLatestStaticAuditBySnapshot,
  listSnapshotsMissingStaticAudits,
  upsertStaticAudit,
} from "./repo";
import { createStaticAuditWorkflowTarget } from "./workflow-target";
import type { StaticAuditWorkflowTarget } from "./workflow-target";

type StaticAuditFinding = StaticAuditReport["security_audit"]["findings"][number];

interface StaticAuditsServiceDeps {
  countSnapshotsMissingStaticAudits: (input: { maxSyncTime?: number }) => Promise<number>;
  createStaticAuditWorkflowTarget: typeof createStaticAuditWorkflowTarget;
  findSnapshotIdForStaticAudit: (input: {
    entryPath?: string;
    owner: string;
    repo: string;
    skillRootPath?: string;
  }) => Promise<string | null>;
  findStaticAuditByIdempotencyKey: (
    idempotencyKey: string,
  ) => Promise<Awaited<ReturnType<typeof findStaticAuditByIdempotencyKey>>>;
  getLatestStaticAuditBySnapshot: (
    snapshotId: string,
  ) => Promise<Awaited<ReturnType<typeof getLatestStaticAuditBySnapshot>>>;
  listSnapshotsMissingStaticAudits: (input: {
    limit: number;
    maxSyncTime?: number;
    offset?: number;
  }) => Promise<Awaited<ReturnType<typeof listSnapshotsMissingStaticAudits>>>;
  dispatchStaticAuditWorkflow: (targets: StaticAuditWorkflowTarget[]) => Promise<
    | {
        dispatched: false;
        reason: string;
      }
    | {
        dispatched: true;
        repository: string;
        workflowFile: string;
      }
  >;
  upsertStaticAudit: typeof upsertStaticAudit;
}

const defaultDeps: StaticAuditsServiceDeps = {
  countSnapshotsMissingStaticAudits: async (input) => {
    const { countSnapshotsMissingStaticAudits } = await import("./repo");
    return await countSnapshotsMissingStaticAudits(input);
  },
  createStaticAuditWorkflowTarget,
  findSnapshotIdForStaticAudit: async (input) => {
    const { findSnapshotIdForStaticAudit } = await import("./repo");
    return await findSnapshotIdForStaticAudit(input);
  },
  findStaticAuditByIdempotencyKey: async (idempotencyKey) => {
    const { findStaticAuditByIdempotencyKey } = await import("./repo");
    return await findStaticAuditByIdempotencyKey(idempotencyKey);
  },
  getLatestStaticAuditBySnapshot: async (snapshotId) => {
    const { getLatestStaticAuditBySnapshot } = await import("./repo");
    return await getLatestStaticAuditBySnapshot(snapshotId);
  },
  listSnapshotsMissingStaticAudits: async (input) => {
    const { listSnapshotsMissingStaticAudits } = await import("./repo");
    return await listSnapshotsMissingStaticAudits(input);
  },
  // oxlint-disable-next-line require-await
  dispatchStaticAuditWorkflow: async () => ({
    dispatched: false as const,
    reason: "missing-dispatch-runtime",
  }),
  upsertStaticAudit: async (input) => {
    const { upsertStaticAudit } = await import("./repo");
    return await upsertStaticAudit(input);
  },
};

const parsePersistedFindings = (findingsJson: string) => {
  try {
    const parsed = JSON.parse(findingsJson) as unknown;
    return Array.isArray(parsed) ? (parsed as StaticAuditFinding[]) : [];
  } catch {
    return [] as StaticAuditFinding[];
  }
};

const getHighestPersistedSeverity = (findings: StaticAuditFinding[]) =>
  findings
    .map((finding) => finding.severity)
    .toSorted((left, right) => {
      const rank = {
        critical: 4,
        high: 3,
        low: 1,
        medium: 2,
      } as const;
      return rank[right] - rank[left];
    })[0];

type PersistedStaticAuditRow = Awaited<ReturnType<typeof getLatestStaticAuditBySnapshot>>;

const buildParsedScanner = (parsedReport: StaticAuditReport) => ({
  filesScanned: parsedReport.security_audit.files_scanned,
  findingsCount: parsedReport.security_audit.findings.length,
  highestSeverity: parsedReport.provider?.summary?.highest_severity,
  llmProvider: parsedReport.provider?.llm?.provider,
  model: parsedReport.provider?.llm?.model,
  policy: parsedReport.provider?.policy,
  providerName: parsedReport.provider?.name ?? "skill-scanner",
  scannerVersion: parsedReport.provider?.scanner_version,
  totalLines: parsedReport.security_audit.total_lines,
});

const buildPersistedScanner = (input: {
  findings: StaticAuditFinding[];
  row: PersistedStaticAuditRow;
}) => ({
  filesScanned: input.row?.filesScanned ?? 0,
  findingsCount: input.findings.length,
  highestSeverity: getHighestPersistedSeverity(input.findings),
  llmProvider: undefined,
  model: input.row?.modelVersion ?? undefined,
  policy: undefined,
  providerName: "skill-scanner",
  scannerVersion: undefined,
  totalLines: input.row?.totalLines ?? 0,
});

const buildScanner = (input: {
  findings: StaticAuditFinding[];
  parsedReport: StaticAuditReport | null;
  row: PersistedStaticAuditRow;
}) =>
  input.parsedReport
    ? buildParsedScanner(input.parsedReport)
    : buildPersistedScanner({
        findings: input.findings,
        row: input.row,
      });

const parseAuditJson = (auditJson: string): StaticAuditReport | null => {
  try {
    return staticAuditReportSchema.parse(JSON.parse(auditJson) as unknown);
  } catch {
    return null;
  }
};

const toTimestamp = (generatedAt: string): number => {
  const parsed = Date.parse(generatedAt);
  if (Number.isNaN(parsed)) {
    throw new TypeError("Invalid generated_at timestamp.");
  }
  return parsed;
};

const buildFallbackIdempotencyKey = (input: {
  owner: string;
  repo: string;
  sourceHash: string;
  sourceRef?: string;
  skillRootPath?: string;
  sourceType: string;
  rulesVersion: string;
}) =>
  createHash("sha256")
    .update(
      [
        input.owner,
        input.repo,
        input.skillRootPath ?? "root",
        input.sourceRef ?? "unknown",
        input.sourceHash,
        input.sourceType,
        input.rulesVersion,
      ].join(":"),
    )
    .digest("hex");

const resolveSnapshotId = async (report: StaticAuditReport, deps: StaticAuditsServiceDeps) => {
  const directSnapshotId = report.target.snapshot_id?.trim();
  if (directSnapshotId) {
    return directSnapshotId;
  }

  return await deps.findSnapshotIdForStaticAudit({
    entryPath: report.target.entry_path,
    owner: report.target.owner,
    repo: report.target.repo,
    skillRootPath: report.target.skill_root_path,
  });
};

const buildIdempotencyKey = (report: StaticAuditReport, snapshotId?: string | null) =>
  snapshotId
    ? `${snapshotId}:${report.meta.source_hash}:${report.meta.rules_version}`
    : buildFallbackIdempotencyKey({
        owner: report.target.owner,
        repo: report.target.repo,
        rulesVersion: report.meta.rules_version,
        skillRootPath: report.target.skill_root_path,
        sourceHash: report.meta.source_hash,
        sourceRef: report.meta.source_ref,
        sourceType: report.meta.source_type,
      });

const buildStaticAuditReport = (row: PersistedStaticAuditRow, findings: StaticAuditFinding[]) => {
  if (!row) {
    return null;
  }

  const parsedReport = parseAuditJson(row.auditJson);
  const reportMarkdown = parsedReport?.artifacts?.report_markdown?.trim() ?? null;

  if (!(reportMarkdown || parsedReport)) {
    return null;
  }

  return {
    auditId: String(row.id),
    findings: parsedReport?.security_audit.findings ?? findings,
    generatedAt: parsedReport?.meta.generated_at ?? new Date(row.generatedAt).toISOString(),
    isBlocked: row.isBlocked,
    overallScore: parsedReport?.evaluation.overall_score ?? row.overallScore,
    reportMarkdown: reportMarkdown ?? undefined,
    reportR2Key: row.reportR2Key ?? undefined,
    riskLevel: row.riskLevel === "safe" ? "low" : row.riskLevel,
    safeToPublish: row.safeToPublish,
    scanner: buildScanner({
      findings,
      parsedReport,
      row,
    }),
    status: row.status,
    summary: row.summary,
    syncTime: row.syncTime,
  };
};

const resolveBackfillBatchSize = (value?: number) => Math.max(1, Math.min(value ?? 10, 25));

const resolveBackfillMinSnapshotAgeMs = (value?: number) =>
  Math.max(0, value ?? 6 * 60 * 60 * 1000);

const resolveBackfillRotationWindowMs = () => 12 * 60 * 60 * 1000;

export const createStaticAuditsService = (overrides: Partial<StaticAuditsServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  return {
    async getReportBySnapshot(snapshotId: string) {
      const row = await deps.getLatestStaticAuditBySnapshot(snapshotId);
      if (!row) {
        return null;
      }

      const findings = parsePersistedFindings(row.findingsJson);
      return buildStaticAuditReport(row, findings);
    },

    async dispatchMissingSnapshotAuditsBatch(input?: {
      batchSize?: number;
      minSnapshotAgeMs?: number;
    }) {
      const batchSize = resolveBackfillBatchSize(input?.batchSize);
      const minSnapshotAgeMs = resolveBackfillMinSnapshotAgeMs(input?.minSnapshotAgeMs);
      const maxSyncTime = Date.now() - minSnapshotAgeMs;
      const eligibleCount = await deps.countSnapshotsMissingStaticAudits({
        maxSyncTime,
      });
      const pageCount = eligibleCount > 0 ? Math.ceil(eligibleCount / batchSize) : 0;
      const rotationWindowMs = resolveBackfillRotationWindowMs();
      const currentWindow = Math.floor(Date.now() / rotationWindowMs);
      const offset = pageCount > 0 ? (currentWindow % pageCount) * batchSize : 0;
      const snapshots = await deps.listSnapshotsMissingStaticAudits({
        limit: batchSize,
        maxSyncTime,
        offset,
      });
      const targets = snapshots.map((snapshot) =>
        deps.createStaticAuditWorkflowTarget({
          owner: snapshot.owner,
          repo: snapshot.repo,
          skillRootPath: snapshot.skillRootPath,
          snapshotId: snapshot.snapshotId,
          sourceCommitSha: snapshot.sourceCommitSha ?? undefined,
        }),
      );
      const dispatch = await deps.dispatchStaticAuditWorkflow(targets);

      return {
        batchSize,
        dispatchReason: dispatch.dispatched ? undefined : dispatch.reason,
        dispatched: dispatch.dispatched,
        eligibleCount,
        minSnapshotAgeMs,
        offset,
        pageCount,
        repository: "repository" in dispatch ? dispatch.repository : undefined,
        selectedCount: snapshots.length,
        skippedMissingCommitShaCount: 0,
        targetSnapshotIds: snapshots.map((snapshot) => snapshot.snapshotId),
        workflowFile: "workflowFile" in dispatch ? dispatch.workflowFile : undefined,
      };
    },

    async ingest(report: StaticAuditReport) {
      const generatedAt = toTimestamp(report.meta.generated_at);
      const snapshotId = await resolveSnapshotId(report, deps);
      const idempotencyKey = buildIdempotencyKey(report, snapshotId);
      const existing = await deps.findStaticAuditByIdempotencyKey(idempotencyKey);

      const savedId = await deps.upsertStaticAudit({
        auditJson: JSON.stringify(report),
        entryPath: report.target.entry_path,
        filesScanned: report.security_audit.files_scanned,
        findingsJson: JSON.stringify(report.security_audit.findings),
        generatedAt,
        idempotencyKey,
        isBlocked: report.evaluation.is_blocked,
        modelVersion: report.meta.model_version,
        overallScore: report.evaluation.overall_score,
        pipeline: report.meta.pipeline,
        pipelineRunId: report.meta.pipeline_run_id,
        reason:
          report.evaluation.safe_to_publish || report.evaluation.status === "pass"
            ? undefined
            : "blocked-by-static-audit",
        repoName: report.target.repo,
        repoOwner: report.target.owner,
        reportR2Key: undefined,
        riskFactorsJson: JSON.stringify(report.security_audit.risk_factors),
        riskLevel: report.evaluation.risk_level,
        rulesVersion: report.meta.rules_version,
        safeToPublish: report.evaluation.safe_to_publish,
        skillRootPath: report.target.skill_root_path,
        snapshotId,
        sourceHash: report.meta.source_hash,
        sourceRef: report.meta.source_ref,
        sourceType: report.meta.source_type,
        status: report.evaluation.status,
        summary: report.security_audit.summary,
        totalLines: report.security_audit.total_lines,
        treeHash: report.meta.tree_hash,
      });

      return {
        auditId: savedId,
        reason:
          report.evaluation.safe_to_publish || report.evaluation.status === "pass"
            ? undefined
            : "blocked-by-static-audit",
        status: report.evaluation.status,
        upserted: !existing,
      };
    },
  };
};

export const staticAuditsService = createStaticAuditsService();

export async function getReportBySnapshot(snapshotId: string) {
  return await staticAuditsService.getReportBySnapshot(snapshotId);
}
