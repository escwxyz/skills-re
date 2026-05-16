import { parseSkillMarkdownDocument } from "@skills-re/utils";
import type { SkillFrontmatterData } from "@skills-re/utils";

export type { SkillFrontmatterData as ParsedFrontmatter } from "@skills-re/utils";

export const SKILL_FILENAME = "SKILL.md";

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

const normalizeSkillIdentity = (value: string) => value.trim().toLowerCase();

const getSkillRootPriority = (skillRootPath: string) => {
  const normalizedRoot = normalizeSkillRootPath(skillRootPath);
  if (normalizedRoot.length === 0) {
    return 0;
  }
  if (normalizedRoot === "skills" || normalizedRoot.startsWith("skills/")) {
    return 1;
  }
  return 2;
};

const shouldPreferSkillRoot = (candidateRootPath: string, currentRootPath: string) => {
  const candidatePriority = getSkillRootPriority(candidateRootPath);
  const currentPriority = getSkillRootPriority(currentRootPath);
  if (candidatePriority !== currentPriority) {
    return candidatePriority < currentPriority;
  }

  const candidateSegments = normalizeSkillRootPath(candidateRootPath).split("/").filter(Boolean);
  const currentSegments = normalizeSkillRootPath(currentRootPath).split("/").filter(Boolean);
  return candidateSegments.length < currentSegments.length;
};

export const dedupeSkillsByIdentity = <T>(
  skills: readonly T[],
  options: {
    getIdentity: (skill: T) => string;
    getSkillRootPath: (skill: T) => string;
  },
) => {
  const selectedByIdentity = new Map<string, { index: number; skill: T }>();
  const uniqueSkills: { index: number; skill: T }[] = [];

  for (const [index, skill] of skills.entries()) {
    const identity = normalizeSkillIdentity(options.getIdentity(skill));
    if (identity.length === 0) {
      uniqueSkills.push({ index, skill });
      continue;
    }

    const existing = selectedByIdentity.get(identity);
    if (!existing) {
      selectedByIdentity.set(identity, { index, skill });
      continue;
    }

    if (
      shouldPreferSkillRoot(
        options.getSkillRootPath(skill),
        options.getSkillRootPath(existing.skill),
      )
    ) {
      selectedByIdentity.set(identity, { index, skill });
    }
  }

  return [...selectedByIdentity.values(), ...uniqueSkills]
    .toSorted((left, right) => left.index - right.index)
    .map((entry) => entry.skill);
};

export const parseFrontmatter = (content: string): SkillFrontmatterData | null =>
  parseSkillMarkdownDocument(content).frontmatter;

const hasDotfileSegment = (path: string) =>
  path.split("/").some((segment) => segment.startsWith(".") && segment !== "." && segment !== "..");

const isSkillMarkdownFile = (path: string) => path.split("/").at(-1) === SKILL_FILENAME;

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
      if (!isSkillMarkdownFile(entry.path)) {
        return false;
      }
      if (!requestedPrefix.length) {
        return true;
      }
      const normalizedEntryPath = normalizeSkillRootPath(entry.path);
      return (
        normalizedEntryPath === requestedPath || normalizedEntryPath.startsWith(requestedPrefix)
      );
    })
    .map((entry) => ({
      skillMdPath: entry.path,
      skillRootPath: entry.path.split("/").slice(0, -1).join("/"),
    }));
};
