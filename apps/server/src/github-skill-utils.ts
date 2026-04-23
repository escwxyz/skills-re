export const SKILL_FILENAME = "skill.md";

export interface ParsedFrontmatter {
  description: string;
  metadata?: Record<string, string>;
  name: string;
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
