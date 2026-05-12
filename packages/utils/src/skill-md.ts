// oxlint-disable no-negated-condition
// oxlint-disable complexity
export interface SkillFrontmatterData {
  allowedTools?: string;
  compatibility?: string;
  description: string;
  license?: string;
  metadata?: Record<string, string>;
  name: string;
}

const normalizeFrontmatterKey = (value: string) => value.trim().toLowerCase().replaceAll("_", "-");

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const toJoinedValue = (value: string | string[] | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
};

const readFrontmatterValue = (
  values: Record<string, string | string[] | undefined>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const resolved = toJoinedValue(values[key]);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
};

export const parseSkillFrontmatter = (source: string): SkillFrontmatterData | null => {
  const values: Record<string, string | string[] | undefined> = {};
  const metadata: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const topLevelMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (topLevelMatch) {
      const [, rawKey, rawValue] = topLevelMatch;
      if (!rawKey) {
        continue;
      }
      currentKey = normalizeFrontmatterKey(rawKey);
      const value = rawValue?.trim() ?? "";
      if (value) {
        values[currentKey] = stripWrappingQuotes(value);
      } else if (currentKey !== "metadata") {
        values[currentKey] = [];
      }
      continue;
    }

    if (currentKey === "metadata" && /^[\t ]+/.test(line)) {
      const metadataMatch = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
      if (metadataMatch) {
        const [, key, value] = metadataMatch;
        if (key !== undefined && value !== undefined) {
          metadata[key] = stripWrappingQuotes(value.trim());
        }
      }
      continue;
    }

    if (trimmed.startsWith("- ") && currentKey) {
      const existing = values[currentKey];
      const nextValue = stripWrappingQuotes(trimmed.slice(2).trim());
      if (Array.isArray(existing)) {
        values[currentKey] = [...existing, nextValue];
      } else if (existing) {
        values[currentKey] = [existing, nextValue];
      } else {
        values[currentKey] = [nextValue];
      }
    }
  }

  const name = readFrontmatterValue(values, "name");
  const description = readFrontmatterValue(values, "description");
  if (!name || !description) {
    return null;
  }

  return {
    allowedTools: readFrontmatterValue(values, "allowed-tools", "allowedtools"),
    compatibility: readFrontmatterValue(values, "compatibility"),
    description,
    license: readFrontmatterValue(values, "license"),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    name,
  };
};

export const parseSkillMarkdownDocument = (source: string) => {
  const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const frontmatterContent = frontmatterMatch?.[1];
  const frontmatter =
    frontmatterContent !== undefined ? parseSkillFrontmatter(frontmatterContent) : null;
  const withoutFrontmatter = frontmatterMatch ? source.slice(frontmatterMatch[0].length) : source;
  const lines = withoutFrontmatter.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  const firstLine = firstContentIndex !== -1 ? lines[firstContentIndex] : undefined;

  if (firstLine !== undefined && /^#\s+/.test(firstLine)) {
    lines.splice(firstContentIndex, 1);
    if (lines[firstContentIndex]?.trim() === "") {
      lines.splice(firstContentIndex, 1);
    }
  }

  const body = lines.join("\n").trim();
  const tocItems = body
    .split(/\r?\n/)
    .map((line) => line.match(/^##+\s+(.+)$/)?.[1]?.trim())
    .filter((item): item is string => item !== undefined);

  return { body, frontmatter, tocItems };
};
