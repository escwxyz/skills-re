import { readFile } from "node:fs/promises";

export interface SkillMetadata {
  description: string;
  name: string;
}

const stripQuotes = (value: string) => value.replace(/^['"]/, "").replace(/['"]$/, "").trim();

export const parseSkillMetadata = (content: string): SkillMetadata | null => {
  if (!content.startsWith("---")) {
    return null;
  }
  const end = content.indexOf("\n---", 3);
  if (end === -1) {
    return null;
  }
  const values = new Map<string, string>();
  for (const line of content.slice(3, end).split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    values.set(line.slice(0, separator).trim(), stripQuotes(line.slice(separator + 1)));
  }
  const name = values.get("name");
  const description = values.get("description");
  return name && description ? { description, name } : null;
};

export const readSkillMetadataFile = async (filePath: string) => {
  const content = await readFile(filePath, "utf-8");
  return {
    content,
    metadata: parseSkillMetadata(content),
  };
};
