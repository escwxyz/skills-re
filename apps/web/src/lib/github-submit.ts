import { z } from "zod";

import { m } from "@/paraglide/messages";

const GIT_SUFFIX_REGEX = /\.git$/i;
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

const normalizeGithubUrlString = (value: string) => {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return trimmed.replace(/^(https?):\/\//i, (match) => match.toLowerCase());
  }
};

export interface GithubSubmitTarget {
  branch?: string;
  githubUrl: string;
  owner: string;
  repo: string;
  skillRootPath?: string;
}

const readOwnerRepo = (segments: string[]) => {
  const [owner = "", repo = ""] = segments;

  if (!(owner && repo)) {
    return null;
  }

  return { owner, repo };
};

const normalizeGithubPathUrl = (parsedUrl: URL, pathname: string) => {
  parsedUrl.pathname = pathname;
  parsedUrl.search = "";
  parsedUrl.hash = "";
  return parsedUrl.toString();
};

const toGithubPathTarget = (parsedUrl: URL, segments: string[]): GithubSubmitTarget | null => {
  const ownerRepo = readOwnerRepo(segments);
  if (!ownerRepo) {
    return null;
  }

  const { owner, repo } = ownerRepo;
  const [resource, branch] = segments.slice(2);
  const tail = segments.slice(4);

  if (!resource) {
    return {
      githubUrl: normalizeGithubPathUrl(parsedUrl, `/${owner}/${repo}`),
      owner,
      repo,
    };
  }

  if (resource !== "tree" && resource !== "blob") {
    return {
      githubUrl: normalizeGithubPathUrl(parsedUrl, `/${owner}/${repo}`),
      owner,
      repo,
    };
  }

  let skillRootPath = tail.join("/");
  if (
    resource === "blob" &&
    skillRootPath &&
    skillRootPath.split("/").at(-1)?.toLowerCase() === "skill.md"
  ) {
    skillRootPath = skillRootPath.split("/").slice(0, -1).join("/");
  }

  return {
    branch,
    githubUrl: normalizeGithubPathUrl(
      parsedUrl,
      `/${owner}/${repo}/${resource}${branch ? `/${branch}` : ""}${tail.length > 0 ? `/${tail.join("/")}` : ""}`,
    ),
    owner,
    repo,
    skillRootPath: normalizeRelativePath(skillRootPath) || undefined,
  };
};

const toGithubShortTarget = (value: string): GithubSubmitTarget | null => {
  const match = REPO_SHORT_REGEX.exec(value);
  if (!match) {
    return null;
  }

  const owner = match[1] ?? "";
  const repo = match[2] ?? "";
  if (!(owner && repo)) {
    return null;
  }

  const branch = match[3] ?? undefined;
  const skillRootPath = normalizeRelativePath(match[4] ?? "") || undefined;

  return {
    branch,
    githubUrl: `https://github.com/${owner}/${repo}${branch ? `/tree/${branch}${skillRootPath ? `/${skillRootPath}` : ""}` : ""}`,
    owner,
    repo,
    skillRootPath,
  };
};

export function parseGithubSubmitUrl(url: string): GithubSubmitTarget | null {
  const normalizedInput = normalizeGithubUrlString(url);
  if (normalizedInput.length === 0) {
    return null;
  }

  const withoutGit = normalizedInput.replace(GIT_SUFFIX_REGEX, "");

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

    return toGithubPathTarget(parsedUrl, segments);
  } catch {
    return toGithubShortTarget(withoutGit);
  }
}

export const githubSubmitUrlSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: m.input_url_required({}) });
      return z.NEVER;
    }

    const parsed = parseGithubSubmitUrl(value);

    if (!parsed) {
      ctx.addIssue({ code: "custom", message: m.logs_invalid_url_error({}) });
      return z.NEVER;
    }

    return parsed;
  });

export type GithubSubmitInput = z.infer<typeof githubSubmitUrlSchema>;
