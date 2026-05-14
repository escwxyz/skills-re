import type { StaticAuditReport } from "../../packages/contract/src/static-audits";

export type StaticAuditFinding = StaticAuditReport["security_audit"]["findings"][number];

export interface AuditTarget {
  owner: string;
  repo: string;
  sourceCommitSha?: string;
  skillRootPath?: string;
  snapshotId?: string;
  sourceRef?: string;
  sourceUrl?: string;
}

export interface AuditTargetRecord extends AuditTarget {
  id: string;
}

export interface AuditIndexItem {
  id: string;
  owner: string;
  repo: string;
  skillRootPath?: string;
  auditJsonPath: string;
  auditMdPath: string;
  auditSarifPath?: string;
  overallScore: number;
  riskLevel: StaticAuditReport["evaluation"]["risk_level"];
  safeToPublish: boolean;
  isBlocked: boolean;
  findingsCount: number;
}

export interface AuditFailedIndexItem {
  id: string;
  owner: string;
  repo: string;
  skillRootPath?: string;
  error: string;
}

export interface AuditIndexPayload {
  generatedAt: string;
  hasBlockedTarget: boolean;
  items: AuditIndexItem[];
  failedItems?: AuditFailedIndexItem[];
}

export interface ToolRunDiagnostics {
  stderr?: string;
  stdout?: string;
}

export interface ToolFindingsResult extends ToolRunDiagnostics {
  findings: StaticAuditFinding[];
}
