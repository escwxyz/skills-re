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

const parseMarkdownTableRow = (line: string): string[] | null => {
  const trimmed = line.trim();
  if (!(trimmed.startsWith("|") && trimmed.includes("|", 1))) {
    return null;
  }

  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = withoutOuterPipes
    .split("|")
    .map((cell) => stripWrappingQuotes(cell.trim().replaceAll("\\|", "|")));
  return cells.length >= 2 ? cells : null;
};

const isMarkdownTableSeparatorRow = (cells: string[]) =>
  cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));

const isMetadataHeaderRow = (cells: string[]) => {
  const [keyCell, valueCell] = cells;
  if (!(keyCell && valueCell)) {
    return false;
  }

  const key = normalizeFrontmatterKey(keyCell);
  const value = normalizeFrontmatterKey(valueCell);
  return (
    ["field", "key", "metadata", "property"].includes(key) && ["content", "value"].includes(value)
  );
};

const parseLeadingMetadataTable = (
  source: string,
): { frontmatter: SkillFrontmatterData; tableEndIndex: number } | null => {
  const lines = source.split(/\r?\n/);
  let firstTableLineIndex = 0;
  while (firstTableLineIndex < lines.length && lines[firstTableLineIndex]?.trim() === "") {
    firstTableLineIndex += 1;
  }

  const rows: string[][] = [];
  let tableEndIndex = firstTableLineIndex;
  for (; tableEndIndex < lines.length; tableEndIndex += 1) {
    const line = lines[tableEndIndex];
    if (line === undefined) {
      break;
    }
    if (line.trim() === "" && rows.length > 0) {
      break;
    }

    const row = parseMarkdownTableRow(line);
    if (!row) {
      break;
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    return null;
  }

  const values: Record<string, string> = {};
  for (const [index, row] of rows.entries()) {
    if (isMarkdownTableSeparatorRow(row) || (index === 0 && isMetadataHeaderRow(row))) {
      continue;
    }

    const [rawKey, ...valueCells] = row;
    if (!rawKey) {
      continue;
    }
    const key = normalizeFrontmatterKey(rawKey);
    const value = valueCells.join("|").trim();
    if (value.length > 0) {
      values[key] = value;
    }
  }

  const name = readFrontmatterValue(values, "name");
  const description = readFrontmatterValue(values, "description");
  if (!name || !description) {
    return null;
  }

  while (tableEndIndex < lines.length && lines[tableEndIndex]?.trim() === "") {
    tableEndIndex += 1;
  }

  return {
    frontmatter: {
      allowedTools: readFrontmatterValue(values, "allowed-tools", "allowedtools"),
      compatibility: readFrontmatterValue(values, "compatibility"),
      description,
      license: readFrontmatterValue(values, "license"),
      name,
    },
    tableEndIndex,
  };
};

export const parseSkillFrontmatter = (source: string): SkillFrontmatterData | null => {
  const values: Record<string, string | string[] | undefined> = {};
  const metadata: Record<string, string> = {};
  let currentKey: string | null = null;
  let blockScalarKey: string | null = null;
  let blockScalarStyle: "folded" | "literal" | null = null;
  const blockScalarLines: string[] = [];

  const flushBlockScalar = () => {
    if (!blockScalarKey || !blockScalarStyle) {
      return;
    }

    while (blockScalarLines.length > 0 && blockScalarLines.at(0) === "") {
      blockScalarLines.shift();
    }
    while (blockScalarLines.length > 0 && blockScalarLines.at(-1) === "") {
      blockScalarLines.pop();
    }

    let result: string;
    if (blockScalarStyle === "folded") {
      const parts: string[] = [];
      let paragraph: string[] = [];
      for (const line of blockScalarLines) {
        if (line === "") {
          if (paragraph.length > 0) {
            parts.push(paragraph.join(" "));
            paragraph = [];
          }
        } else {
          paragraph.push(line);
        }
      }
      if (paragraph.length > 0) {
        parts.push(paragraph.join(" "));
      }
      result = parts.join("\n");
    } else {
      result = blockScalarLines.join("\n").trim();
    }

    if (result) {
      values[blockScalarKey] = result;
    }
    blockScalarKey = null;
    blockScalarStyle = null;
    blockScalarLines.length = 0;
  };

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (blockScalarKey !== null) {
      if (/^[\t ]/.test(line) || trimmed === "") {
        blockScalarLines.push(trimmed);
        continue;
      }
      flushBlockScalar();
    }

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
      if (/^[>|][->+]?$/.test(value)) {
        blockScalarKey = currentKey;
        blockScalarStyle = value.startsWith(">") ? "folded" : "literal";
        blockScalarLines.length = 0;
        continue;
      }
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

  flushBlockScalar();

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
  const tableFrontmatter = frontmatterMatch ? null : parseLeadingMetadataTable(source);
  const frontmatter =
    frontmatterContent !== undefined
      ? parseSkillFrontmatter(frontmatterContent)
      : (tableFrontmatter?.frontmatter ?? null);
  let withoutFrontmatter = source;
  if (frontmatterMatch) {
    withoutFrontmatter = source.slice(frontmatterMatch[0].length);
  } else if (tableFrontmatter) {
    withoutFrontmatter = source.split(/\r?\n/).slice(tableFrontmatter.tableEndIndex).join("\n");
  }
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
