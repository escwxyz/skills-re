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

export interface SkillTocItem {
  slug: string;
  title: string;
}

export const slugifyHeadingBase = (value: string) => {
  const normalized = value.normalize("NFKD").toLowerCase().trim();
  const slug = normalized
    .replaceAll(/["'’]/g, "")
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return slug || "section";
};

const createUniqueHeadingSlug = (value: string, counts: Map<string, number>) => {
  const baseSlug = slugifyHeadingBase(value);
  const currentCount = counts.get(baseSlug) ?? 0;
  counts.set(baseSlug, currentCount + 1);
  return currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;
};

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

const isFenceLine = (line: string) => /^\s*(```|~~~)/.test(line);

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
  const tocItems: SkillTocItem[] = [];
  const headingCounts = new Map<string, number>();
  let inFenceBlock = false;

  for (const line of body.split(/\r?\n/)) {
    if (isFenceLine(line)) {
      inFenceBlock = !inFenceBlock;
      continue;
    }

    if (inFenceBlock) {
      continue;
    }

    const headingMatch = line.match(/^(#{2,6})\s+(.+?)(?:\s+#+\s*)?$/);
    const title = headingMatch?.[2]?.trim();

    if (!title) {
      continue;
    }

    tocItems.push({
      slug: createUniqueHeadingSlug(title, headingCounts),
      title,
    });
  }

  return { body, frontmatter, tocItems };
};
