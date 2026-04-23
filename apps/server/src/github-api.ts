const GITHUB_API_ROOT = "https://api.github.com";
const GITHUB_API_HEADERS = {
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
} as const;

export type GithubTokenEnv = Partial<Pick<Env, "GH_PAT">>;

export interface GithubRepoResponse {
  archived?: boolean;
  created_at?: string | null;
  default_branch: string;
  disabled?: boolean;
  fork?: boolean;
  forks_count: number;
  full_name: string;
  html_url?: string | null;
  license?: { name?: string | null } | null;
  owner?: {
    avatar_url?: string | null;
    login?: string | null;
    name?: string | null;
  } | null;
  private?: boolean;
  stargazers_count: number;
  updated_at?: string | null;
}

export interface GithubCommitResponse {
  commit?: {
    author?: { date?: string | null } | null;
    committer?: { date?: string | null } | null;
    message?: string | null;
  } | null;
  html_url?: string | null;
  sha: string;
}

export interface GithubCommitSummary {
  committedDate: string | null;
  message: string | null;
  sha: string;
  url: string | null;
}

export interface GithubRepoOverviewRepo {
  createdAt: string | null;
  forkCount: number | null;
  isArchived: boolean | null;
  isDisabled: boolean | null;
  isEmpty: null;
  isFork: boolean | null;
  isPrivate: boolean | null;
  licenseName: string | null;
  nameWithOwner: string | null;
  stargazerCount: number | null;
  updatedAt: string | null;
  url: string | null;
}

export interface GithubRepoOverview {
  commits: GithubCommitSummary[];
  defaultBranch: string;
  headSha: string | null;
  owner: {
    avatarUrl: string | null;
    handle: string;
    name: string | null;
  };
  repo: GithubRepoOverviewRepo;
}

export const getGithubToken = (env: GithubTokenEnv) => env.GH_PAT || null;

export const createGithubHeaders = (env: GithubTokenEnv) => {
  const headers = new Headers(GITHUB_API_HEADERS);
  const token = getGithubToken(env);

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
};

export interface FetchGithubJsonOptions {
  includeResponseMessage?: boolean;
}

export const fetchGithubJson = async <T>(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  options: FetchGithubJsonOptions = {},
) => {
  const response = await fetchImpl(input, init);
  if (!response.ok) {
    let reason = "";
    if (options.includeResponseMessage) {
      const body = await response.text().catch(() => "");
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) {
          reason = ` — ${parsed.message}`;
        }
      } catch {
        // non-JSON body; ignore
      }
    }

    throw new Error(`GitHub request failed with ${response.status} for ${input}${reason}`);
  }

  return (await response.json()) as T;
};

const toOwnerName = (value: string | null | undefined) => value ?? null;

const mapGithubCommits = (commitsResponse: GithubCommitResponse[]): GithubCommitSummary[] =>
  commitsResponse.map((commit) => ({
    committedDate: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
    message: commit.commit?.message ?? null,
    sha: commit.sha,
    url: commit.html_url ?? null,
  }));

const mapGithubOwner = (
  repoResponse: GithubRepoResponse,
  owner: string,
): GithubRepoOverview["owner"] => ({
  avatarUrl: repoResponse.owner?.avatar_url ?? null,
  handle: repoResponse.owner?.login ?? owner,
  name: toOwnerName(repoResponse.owner?.name),
});

const mapGithubRepoOverview = (
  repoResponse: GithubRepoResponse,
  owner: string,
  repo: string,
  includeLifecycleFlags: boolean,
): GithubRepoOverview["repo"] => ({
  createdAt: repoResponse.created_at ?? null,
  forkCount: repoResponse.forks_count ?? null,
  isArchived: includeLifecycleFlags ? (repoResponse.archived ?? null) : null,
  isDisabled: includeLifecycleFlags ? (repoResponse.disabled ?? null) : null,
  isEmpty: null,
  isFork: repoResponse.fork ?? null,
  isPrivate: repoResponse.private ?? null,
  licenseName: repoResponse.license?.name ?? null,
  nameWithOwner: repoResponse.full_name ?? `${owner}/${repo}`,
  stargazerCount: repoResponse.stargazers_count ?? null,
  updatedAt: repoResponse.updated_at ?? null,
  url: repoResponse.html_url ?? null,
});

export const buildGithubRepoOverview = async (
  fetchImpl: typeof fetch,
  headers: Headers,
  owner: string,
  repo: string,
  options: {
    branch?: string;
    includeLifecycleFlags?: boolean;
  } = {},
): Promise<GithubRepoOverview> => {
  const repoResponse = await fetchGithubJson<GithubRepoResponse>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}`,
    { headers },
  );
  const commitsResponse = await fetchGithubJson<GithubCommitResponse[]>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}/commits?per_page=2${
      options.branch ? `&sha=${encodeURIComponent(options.branch)}` : ""
    }`,
    { headers },
  );

  const defaultBranch = options.branch ?? repoResponse.default_branch;
  return {
    commits: mapGithubCommits(commitsResponse),
    defaultBranch,
    headSha: commitsResponse[0]?.sha ?? null,
    owner: mapGithubOwner(repoResponse, owner),
    repo: mapGithubRepoOverview(repoResponse, owner, repo, options.includeLifecycleFlags ?? false),
  };
};

export { GITHUB_API_ROOT };
