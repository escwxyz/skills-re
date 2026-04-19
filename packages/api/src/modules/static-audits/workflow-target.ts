export interface StaticAuditWorkflowTarget {
  owner: string;
  repo: string;
  skillRootPath?: string;
  snapshotId?: string;
  sourceCommitSha?: string;
  sourceRef?: string;
}

interface CreateStaticAuditWorkflowTargetInput {
  owner: string;
  repo: string;
  skillRootPath?: string | null;
  snapshotId?: string;
  sourceCommitSha?: string;
  sourceRef?: string;
}

export const createStaticAuditWorkflowTarget = (
  input: CreateStaticAuditWorkflowTargetInput,
): StaticAuditWorkflowTarget => ({
  owner: input.owner,
  repo: input.repo,
  skillRootPath: input.skillRootPath?.trim() || undefined,
  snapshotId: input.snapshotId,
  sourceCommitSha: input.sourceCommitSha,
  sourceRef: input.sourceRef,
});
