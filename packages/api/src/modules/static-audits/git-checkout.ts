export const getAuditTargetFetchArgs = (sourceCommitSha?: string) =>
  sourceCommitSha ? (["fetch", "--depth", "1", "origin", sourceCommitSha] as const) : null;

export const getAuditTargetCheckoutArgs = (sourceCommitSha?: string) =>
  ["checkout", "--detach", sourceCommitSha ?? "HEAD"] as const;
