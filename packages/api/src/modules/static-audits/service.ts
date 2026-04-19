import { staticAuditReportSchema } from "@skills-re/contract/static-audits";
import type { StaticAuditReport } from "@skills-re/contract/static-audits";

import type { getLatestStaticAuditBySnapshot, listSnapshotsMissingStaticAudits } from "./repo";
import { createStaticAuditWorkflowTarget } from "./workflow-target";
import type { StaticAuditWorkflowTarget } from "./workflow-target";

type StaticAuditFinding = StaticAuditReport["security_audit"]["findings"][number];

interface StaticAuditsServiceDeps {
  countSnapshotsMissingStaticAudits: (input: { maxSyncTime?: number }) => Promise<number>;
  createStaticAuditWorkflowTarget: typeof createStaticAuditWorkflowTarget;
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
}

const defaultDeps: StaticAuditsServiceDeps = {
  countSnapshotsMissingStaticAudits: async (input) => {
    const { countSnapshotsMissingStaticAudits } = await import("./repo");
    return await countSnapshotsMissingStaticAudits(input);
  },
  createStaticAuditWorkflowTarget,
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
  };
};

export const staticAuditsService = createStaticAuditsService();

export async function getReportBySnapshot(snapshotId: string) {
  return await staticAuditsService.getReportBySnapshot(snapshotId);
}
