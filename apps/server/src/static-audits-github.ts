import { createGithubHeaders } from "./github-api";

interface GitHubWorkflowDispatchConfig {
  owner: string;
  ref: string;
  repo: string;
  workflowFile: string;
}

export interface StaticAuditWorkflowTarget {
  owner: string;
  repo: string;
  skillRootPath?: string;
  snapshotId?: string;
  sourceCommitSha?: string;
  sourceRef?: string;
}

interface StaticAuditWorkflowDispatchResult {
  dispatched: false;
  reason: string;
}

interface StaticAuditWorkflowDispatchSuccess {
  dispatched: true;
  repository: string;
  workflowFile: string;
}

export type StaticAuditWorkflowDispatchOutcome =
  | StaticAuditWorkflowDispatchResult
  | StaticAuditWorkflowDispatchSuccess;

interface StaticAuditGithubRuntimeOptions {
  fetch?: typeof fetch;
}

const DEFAULT_WORKFLOW_FILE = "skill-audit-submit.yml";
const DEFAULT_WORKFLOW_REF = "main";
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

const getRepoPairFromSegments = (segments: string[]) => {
  const owner = segments.at(0);
  const repo = segments.at(1);
  if (!(owner && repo)) {
    return null;
  }

  return normalizeRepoPair(owner, repo);
};

const normalizeRepoPair = (owner: string, repo: string) => {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim().replace(/\.git$/iu, "");
  if (!(normalizedOwner && normalizedRepo)) {
    return null;
  }

  return {
    owner: normalizedOwner,
    repo: normalizedRepo,
  };
};

const parseRepoNameWithOwner = (value: string | undefined) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalized);
    if (GITHUB_HOSTS.has(parsedUrl.hostname)) {
      return getRepoPairFromSegments(
        parsedUrl.pathname.split("/").filter((segment) => segment.length > 0),
      );
    }
  } catch {
    //
  }

  // biome-ignore lint/performance/useTopLevelRegex: repository parsing only
  const sshMatch = /^git@github\.com:([^/]+)\/(.+)$/iu.exec(normalized);
  if (sshMatch) {
    const owner = sshMatch.at(1);
    const repo = sshMatch.at(2);
    if (owner && repo) {
      return normalizeRepoPair(owner, repo);
    }
  }

  return getRepoPairFromSegments(normalized.split("/").filter((segment) => segment.length > 0));
};

const getWorkflowConfig = (
  env: Partial<
    Pick<
      Env,
      | "SKILL_AUDIT_GITHUB_REPO"
      | "SKILL_AUDIT_GITHUB_WORKFLOW_FILE"
      | "SKILL_AUDIT_GITHUB_WORKFLOW_REF"
    >
  >,
) => {
  const repository = parseRepoNameWithOwner(env.SKILL_AUDIT_GITHUB_REPO);
  if (!repository) {
    return null;
  }

  return {
    ...repository,
    ref: env.SKILL_AUDIT_GITHUB_WORKFLOW_REF ?? DEFAULT_WORKFLOW_REF,
    workflowFile: env.SKILL_AUDIT_GITHUB_WORKFLOW_FILE ?? DEFAULT_WORKFLOW_FILE,
  };
};

const buildWorkflowDispatchApiUrl = (config: GitHubWorkflowDispatchConfig) =>
  `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${encodeURIComponent(
    config.workflowFile,
  )}/dispatches`;

const describeDispatchError = (error: unknown, config: GitHubWorkflowDispatchConfig) => {
  const apiUrl = buildWorkflowDispatchApiUrl(config);
  const baseMessage = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;

  if (status === 404) {
    return `GitHub workflow dispatch returned 404 for ${apiUrl}. On private repositories this usually means the configured token cannot read ${config.owner}/${config.repo}, or the workflow file ${config.workflowFile} is not visible on ref ${config.ref}. For fine-grained PATs, grant this repository access plus Metadata: read, Contents: read, and Actions: write. Original error: ${baseMessage}`;
  }

  return `${baseMessage} (GitHub workflow dispatch API: ${apiUrl})`;
};

export const createStaticAuditGithubRuntime = (
  env: Partial<
    Pick<
      Env,
      | "GH_PAT"
      | "SKILL_AUDIT_GITHUB_REPO"
      | "SKILL_AUDIT_GITHUB_WORKFLOW_FILE"
      | "SKILL_AUDIT_GITHUB_WORKFLOW_REF"
    >
  >,
  options: StaticAuditGithubRuntimeOptions = {},
) => {
  const fetchImpl = options.fetch ?? fetch;
  const config = getWorkflowConfig(env);

  return {
    async dispatchStaticAuditWorkflow(
      targets: StaticAuditWorkflowTarget[],
    ): Promise<StaticAuditWorkflowDispatchOutcome> {
      if (targets.length === 0) {
        return {
          dispatched: false as const,
          reason: "no-targets",
        };
      }

      if (!config) {
        return {
          dispatched: false as const,
          reason: "missing-config",
        };
      }

      const response = await fetchImpl(buildWorkflowDispatchApiUrl(config), {
        body: JSON.stringify({
          inputs: {
            pipeline_run_id: crypto.randomUUID(),
            targets_json: JSON.stringify(targets),
          },
          ref: config.ref,
        }),
        headers: createGithubHeaders(env),
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          describeDispatchError(
            {
              message: `GitHub workflow dispatch failed with ${response.status}`,
              status: response.status,
            },
            config,
          ),
        );
      }

      return {
        dispatched: true as const,
        repository: `${config.owner}/${config.repo}`,
        workflowFile: config.workflowFile,
      };
    },
  };
};
