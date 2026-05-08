export const SKILL_FILENAME = "skill.md";

export interface ParsedFrontmatter {
  description: string;
  metadata?: Record<string, string>;
  name: string;
}

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

export const parseFrontmatter = (content: string): ParsedFrontmatter | null => {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return null;
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex < 0) {
    return null;
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const result: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    result[key] = value.replaceAll(/^['"]|['"]$/g, "");
  }

  if (!result.name || !result.description) {
    return null;
  }

  return {
    description: result.description,
    metadata: Object.keys(result).length > 2 ? result : undefined,
    name: result.name,
  };
};

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
  frontmatter: ParsedFrontmatter,
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
