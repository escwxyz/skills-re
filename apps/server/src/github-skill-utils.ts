import { parseSkillMarkdownDocument } from "@skills-re/utils";
import type { SkillFrontmatterData } from "@skills-re/utils";

export type { SkillFrontmatterData as ParsedFrontmatter } from "@skills-re/utils";

export const SKILL_FILENAME = "skill.md";

export interface SkillDuplicateFingerprint {
  frontmatterHash: string;
  skillContentHash: string;
}

export const normalizeRelativePath = (value: string) => {
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

export const normalizeSkillRootPath = (value: string) =>
  normalizeRelativePath(value).replace(/^\/+/, "").replace(/\/+$/, "");

export const parseFrontmatter = (content: string): SkillFrontmatterData | null =>
  parseSkillMarkdownDocument(content).frontmatter;

const hasDotfileSegment = (path: string) =>
  path.split("/").some((segment) => segment.startsWith(".") && segment !== "." && segment !== "..");

export const hashTextSha256 = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).toSorted(([left], [right]) =>
    left.localeCompare(right),
  );

  const serialized = entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",");
  return `{${serialized}}`;
};

export const buildSkillDuplicateFingerprint = async (
  frontmatter: SkillFrontmatterData,
  skillMdContent: string,
): Promise<SkillDuplicateFingerprint> => ({
  frontmatterHash: await hashTextSha256(stableStringify(frontmatter)),
  skillContentHash: await hashTextSha256(skillMdContent),
});

export const buildSkillDuplicateFingerprintFromSkillMd = async (skillMdContent: string) => {
  const parsed = parseFrontmatter(skillMdContent);
  if (!parsed) {
    return null;
  }

  return await buildSkillDuplicateFingerprint(parsed, skillMdContent);
};

export const discoverSkillRoots = <
  T extends {
    path: string;
    sha: string;
    size?: number;
    type: "blob" | "tree";
  },
>(
  tree: readonly T[],
  requestedSkillPath?: string,
) => {
  const requestedPath = requestedSkillPath?.trim() ?? "";
  const requestedPrefix = requestedPath.length > 0 ? `${requestedPath}/` : "";

  return tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => !hasDotfileSegment(entry.path))
    .filter((entry) => {
      if (!entry.path.toLowerCase().endsWith(`/${SKILL_FILENAME}`)) {
        return false;
      }
      if (!requestedPrefix.length) {
        return true;
      }
      return (
        entry.path === `${requestedPath}/${SKILL_FILENAME}` ||
        entry.path.startsWith(requestedPrefix)
      );
    })
    .map((entry) => ({
      skillMdPath: entry.path,
      skillRootPath: entry.path.split("/").slice(0, -1).join("/"),
    }));
};
