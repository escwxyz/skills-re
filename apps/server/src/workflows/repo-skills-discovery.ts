export interface RepoSkillsDiscoveryWorkflowPayload {
  expectedUpdatedAt?: number;
  repoName: string;
  repoOwner: string;
}

export interface RepoSkillImportWorkflowPayload {
  repoName: string;
  repoOwner: string;
  skillRootPath: string;
}

export interface RepoSkillSnapshotSyncWorkflowPayload {
  expectedHeadSha: string;
  repoName: string;
  repoOwner: string;
  skillId: string;
  skillRootPath: string;
}
