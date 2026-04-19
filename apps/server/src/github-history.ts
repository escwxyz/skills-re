import type { GithubSnapshotHistoryHelpers, GithubSnapshotTreeEntry } from "@skills-re/api/types";

const GITHUB_API_ROOT = "https://api.github.com";
// const SKILL_ROOT_PREFIX = "skills/";
const EXCLUDED_PREFIXES = [
  "node_modules/",
  "dist/",
  "build/",
  "out/",
  ".next/",
  ".turbo/",
  "target/",
  ".DS_Store",
];

interface CreateGithubSnapshotHistoryHelpersOptions {
  fetch?: typeof fetch;
}

const normalizeRelativePath = (value: string) => {
  const segments: string[] = [];
  for (const rawSegment of value.split("/")) {
    const segment = rawSegment.trim();
    if (segment.length === 0 || segment === ".") {
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

const normalizeSkillRootPath = (value: string) => {
  const normalized = normalizeRelativePath(value).replace(/^\/+/, "");
  return normalized.replace(/\/+$/, "");
};

const shouldExcludePath = (relativePath: string) =>
  EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));

const isDefined = <T>(value: T | null | undefined): value is T => value !== null;

const getGithubToken = (env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>) =>
  env.GH_PAT || env.GITHUB_TOKEN || null;

const decodeBase64 = (value: string) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf-8");
  }

  return atob(value);
};

const fetchJson = async <T>(fetchImpl: typeof fetch, input: string, init: RequestInit) => {
  const response = await fetchImpl(input, init);
  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status} for ${input}`);
  }

  return (await response.json()) as T;
};

export function createGithubSnapshotHistoryHelpers(
  env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>,
  options: CreateGithubSnapshotHistoryHelpersOptions = {},
): GithubSnapshotHistoryHelpers {
  const fetchImpl = options.fetch ?? fetch;
  const token = getGithubToken(env);

  const createHeaders = () => {
    const headers = new Headers({
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    });

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  };

  return {
    buildSkillTreeEntries(tree, skillRootPath) {
      const normalizedRootPath = normalizeSkillRootPath(skillRootPath);
      const rootPrefix = normalizedRootPath.length > 0 ? `${normalizedRootPath}/` : "";

      return tree
        .filter((node) => {
          if (rootPrefix.length > 0 && !node.path.startsWith(rootPrefix)) {
            return false;
          }

          const relativePath = rootPrefix.length ? node.path.slice(rootPrefix.length) : node.path;
          return !shouldExcludePath(relativePath);
        })
        .map((node) => {
          const relativePath = rootPrefix.length ? node.path.slice(rootPrefix.length) : node.path;
          const path = normalizeRelativePath(relativePath);
          if (path.length === 0) {
            return null;
          }

          return {
            path,
            sha: node.sha,
            size: node.size,
            type: node.type,
          } satisfies GithubSnapshotTreeEntry;
        })
        .filter(isDefined)
        .toSorted((left, right) => {
          const pathCompare = left.path.localeCompare(right.path);
          if (pathCompare !== 0) {
            return pathCompare;
          }

          const typeCompare = left.type.localeCompare(right.type);
          if (typeCompare !== 0) {
            return typeCompare;
          }

          return left.sha.localeCompare(right.sha);
        });
    },

    async fetchCommitSha({ owner, ref, repo }) {
      const response = await fetchJson<{ sha: string }>(
        fetchImpl,
        `${GITHUB_API_ROOT}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
        {
          headers: createHeaders(),
        },
      );

      return response.sha;
    },

    async fetchSkillFilesForRoot({ owner, repo, skillRootPath, tree }) {
      const normalizedRootPath = normalizeSkillRootPath(skillRootPath);
      const rootPrefix = normalizedRootPath.length > 0 ? `${normalizedRootPath}/` : "";
      const files: { content: string; path: string }[] = [];

      for (const node of tree) {
        if (node.type !== "blob") {
          continue;
        }
        if (rootPrefix.length > 0 && !node.path.startsWith(rootPrefix)) {
          continue;
        }

        const relativePath = rootPrefix.length ? node.path.slice(rootPrefix.length) : node.path;
        if (relativePath.length === 0 || shouldExcludePath(relativePath)) {
          continue;
        }

        const blob = await fetchJson<{
          content: string;
          encoding: string;
        }>(fetchImpl, `${GITHUB_API_ROOT}/repos/${owner}/${repo}/git/blobs/${node.sha}`, {
          headers: createHeaders(),
        });

        if (blob.encoding !== "base64") {
          continue;
        }

        files.push({
          content: decodeBase64(blob.content.replaceAll("\n", "")),
          path: normalizeRelativePath(relativePath),
        });
      }

      return {
        files: files.filter((file) => file.path.length > 0),
      };
    },

    async fetchTree({ commitSha, owner, repo }) {
      const response = await fetchJson<{
        truncated?: boolean;
        tree: {
          path: string;
          sha: string;
          size?: number;
          type: "blob" | "tree" | string;
        }[];
      }>(
        fetchImpl,
        `${GITHUB_API_ROOT}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
        {
          headers: createHeaders(),
        },
      );

      if (response.truncated) {
        throw new Error("Repository tree is too large to fetch.");
      }

      return response.tree
        .filter((entry) => entry.type === "blob" || entry.type === "tree")
        .map((entry) => ({
          path: normalizeRelativePath(entry.path),
          sha: entry.sha,
          size: entry.size,
          type: entry.type as "blob" | "tree",
        }))
        .filter((entry) => entry.path.length > 0);
    },

    hasGithubToken() {
      return Boolean(token);
    },
  };
}
