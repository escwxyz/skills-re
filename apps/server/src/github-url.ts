const GIT_SUFFIX_REGEX = /\.git$/;
const REPO_SHORT_REGEX = /^([\w.-]+)\/([\w.-]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*))?)?$/;

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

export function parseGithubRepoUrl(
  url: string,
): { owner: string; repo: string; branch?: string; skillPath?: string } | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutGit = trimmed.replace(GIT_SUFFIX_REGEX, "");

  try {
    const parsedUrl = new URL(withoutGit);
    const host = parsedUrl.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
      return null;
    }

    const segments = parsedUrl.pathname
      .replaceAll(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const owner = segments[0] ?? "";
    const repo = segments[1] ?? "";
    if (!(owner && repo)) {
      return null;
    }
    if (segments.length <= 2) {
      return { owner, repo };
    }

    const resource = segments[2];
    if (resource === "tree" || resource === "blob") {
      const branch = segments[3];
      const tail = segments.slice(4);
      let skillPath = tail.join("/");
      if (
        resource === "blob" &&
        skillPath &&
        skillPath.split("/").at(-1)?.toLowerCase() === "skill.md"
      ) {
        skillPath = skillPath.split("/").slice(0, -1).join("/");
      }

      return {
        branch,
        owner,
        repo,
        skillPath: normalizeRelativePath(skillPath) || undefined,
      };
    }

    return { owner, repo };
  } catch {
    const match = REPO_SHORT_REGEX.exec(withoutGit);
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
  }
}
