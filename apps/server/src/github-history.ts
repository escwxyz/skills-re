import type { GithubSnapshotHistoryHelpers, GithubSnapshotTreeEntry } from "@skills-re/api/types";

import { GITHUB_API_ROOT, createGithubHeaders, fetchGithubJson } from "./github-api";
import type { WorkerLogger } from "./worker-logger";

// const SKILL_ROOT_PREFIX = "skills/";
const EXCLUDED_SEGMENTS = [
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  "target",
  ".DS_Store",
] as const;
const EXCLUDED_SEGMENT_SET: ReadonlySet<string> = new Set(EXCLUDED_SEGMENTS);

interface CreateGithubSnapshotHistoryHelpersOptions {
  fetch?: typeof fetch;
  logger?: WorkerLogger;
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

const shouldExcludePath = (relativePath: string) => {
  const segments = relativePath
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  return segments.some((segment) => EXCLUDED_SEGMENT_SET.has(segment));
};

const isDefined = <T>(value: T | null | undefined): value is T => value !== null;

const decodeBase64 = (value: string) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf-8");
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }

  return new TextDecoder().decode(bytes);
};

export function createGithubSnapshotHistoryHelpers(
  env: Partial<Pick<Env, "GH_PAT">>,
  options: CreateGithubSnapshotHistoryHelpersOptions = {},
): GithubSnapshotHistoryHelpers {
  const fetchImpl = options.fetch ?? fetch;
  const headers = createGithubHeaders(env);
  const logger = options.logger?.child({
    component: "github-history",
    hasGithubToken: Boolean(env.GH_PAT),
  });

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
      const response = await fetchGithubJson<{ sha: string }>(
        fetchImpl,
        `${GITHUB_API_ROOT}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
        {
          headers,
        },
        {
          includeResponseMessage: true,
          logger,
          logContext: { operation: "commit-sha", owner, repo },
        },
      );

      return response.sha;
    },

    async fetchSkillFilesForRoot({ owner, repo, skillRootPath, tree }) {
      const normalizedRootPath = normalizeSkillRootPath(skillRootPath);
      const rootPrefix = normalizedRootPath.length > 0 ? `${normalizedRootPath}/` : "";

      const blobNodes = tree.flatMap((node) => {
        if (node.type !== "blob") {
          return [];
        }
        if (rootPrefix.length > 0 && !node.path.startsWith(rootPrefix)) {
          return [];
        }
        const relativePath = rootPrefix.length ? node.path.slice(rootPrefix.length) : node.path;
        if (relativePath.length === 0 || shouldExcludePath(relativePath)) {
          return [];
        }
        return [{ node, relativePath }];
      });

      const results = await Promise.all(
        blobNodes.map(async ({ node, relativePath }) => {
          const blob = await fetchGithubJson<{
            content: string;
            encoding: string;
          }>(
            fetchImpl,
            `${GITHUB_API_ROOT}/repos/${owner}/${repo}/git/blobs/${node.sha}`,
            { headers },
            {
              includeResponseMessage: true,
              logger,
              logContext: { operation: "repo-blob", owner, repo },
            },
          );

          if (blob.encoding !== "base64") {
            return null;
          }

          return {
            content: decodeBase64(blob.content.replaceAll("\n", "")),
            path: normalizeRelativePath(relativePath),
          };
        }),
      );

      return {
        files: results.filter(
          (file): file is NonNullable<typeof file> => file !== null && file.path.length > 0,
        ),
      };
    },

    async fetchTree({ commitSha, owner, repo }) {
      const response = await fetchGithubJson<{
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
          headers,
        },
        {
          includeResponseMessage: true,
          logger,
          logContext: { operation: "history-tree", owner, repo },
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
      return Boolean(env.GH_PAT);
    },
  };
}
