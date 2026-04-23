const GIT_SUFFIX_REGEX = /\.git$/;
const REPO_SHORT_REGEX = /^([\w.-]+)\/([\w.-]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*))?)?$/;
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

interface GithubRepoUrlParts {
  owner: string;
  repo: string;
  branch?: string;
  skillPath?: string;
}

const normalizeRelativePath = (value: string) => {
  const segments: string[] = [];
  for (const rawSegment of value.split("/")) {
    const segment = rawSegment.trim();
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join("/");
};

const parseGithubPathSegments = (segments: string[]): GithubRepoUrlParts | null => {
  if (segments.length < 2) {
    return null;
  }

  const [owner = "", repo = "", resource, branch, ...tail] = segments;
  if (!(owner && repo)) {
    return null;
  }

  if (segments.length <= 2) {
    return { owner, repo };
  }

  if (resource !== "tree" && resource !== "blob") {
    return { owner, repo };
  }

  const rawSkillPath = tail.join("/");
  const skillPath = normalizeGithubSkillPath(resource, rawSkillPath);

  return {
    branch,
    owner,
    repo,
    skillPath,
  };
};

const normalizeGithubSkillPath = (resource: "tree" | "blob", value: string) => {
  let skillPath = value;
  if (
    resource === "blob" &&
    skillPath &&
    skillPath.split("/").at(-1)?.toLowerCase() === "skill.md"
  ) {
    skillPath = skillPath.split("/").slice(0, -1).join("/");
  }

  return normalizeRelativePath(skillPath) || undefined;
};

const parseGithubShortUrl = (value: string): GithubRepoUrlParts | null => {
  const match = REPO_SHORT_REGEX.exec(value);
  if (!match) {
    return null;
  }

  const owner = match[1] ?? "";
  const repo = match[2] ?? "";
  if (!(owner && repo)) {
    return null;
  }
  if (!match[3]) {
    return { owner, repo };
  }

  return {
    branch: match[3],
    owner,
    repo,
    skillPath: normalizeRelativePath(match[4] ?? "") || undefined,
  };
};

const parseGithubAbsoluteUrl = (value: string): GithubRepoUrlParts | null => {
  const parsedUrl = new URL(value);
  if (!GITHUB_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    return null;
  }

  const segments = parsedUrl.pathname
    .replaceAll(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  return parseGithubPathSegments(segments);
};

export function parseGithubRepoUrl(url: string): GithubRepoUrlParts | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutGit = trimmed.replace(GIT_SUFFIX_REGEX, "");

  try {
    return parseGithubAbsoluteUrl(withoutGit);
  } catch {
    return parseGithubShortUrl(withoutGit);
  }
}
