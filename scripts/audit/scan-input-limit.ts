import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".agents",
  ".codex",
  ".claude",
]);
const TRUNCATION_NOTICE = "\n\n[truncated by skills.re audit input limiter]\n";

export interface TruncatedScanInputFile {
  originalChars: number;
  relativePath: string;
  writtenChars: number;
}

export interface PrepareBoundedScanInputResult {
  scanDir: string;
  truncatedFiles: TruncatedScanInputFile[];
}

const normalizePath = (value: string) => value.replaceAll("\\", "/");

const truncateContent = (content: string, maxFileChars: number) => {
  if (content.length <= maxFileChars) {
    return content;
  }

  if (maxFileChars <= TRUNCATION_NOTICE.length) {
    return content.slice(0, maxFileChars);
  }

  return `${content.slice(0, maxFileChars - TRUNCATION_NOTICE.length)}${TRUNCATION_NOTICE}`;
};

const copyBoundedEntry = async (input: {
  destinationDir: string;
  maxFileChars: number;
  relativePath: string;
  sourceDir: string;
  truncatedFiles: TruncatedScanInputFile[];
}) => {
  const sourcePath = path.join(input.sourceDir, input.relativePath);
  const destinationPath = path.join(input.destinationDir, input.relativePath);
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  await fs.mkdir(destinationPath, { recursive: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await copyBoundedEntry({
        ...input,
        relativePath: path.join(input.relativePath, entry.name),
      });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const entryRelativePath = path.join(input.relativePath, entry.name);
    const sourceFilePath = path.join(input.sourceDir, entryRelativePath);
    const destinationFilePath = path.join(input.destinationDir, entryRelativePath);
    const content = await fs.readFile(sourceFilePath, "utf-8");
    const boundedContent = truncateContent(content, input.maxFileChars);

    await fs.mkdir(path.dirname(destinationFilePath), { recursive: true });
    await fs.writeFile(destinationFilePath, boundedContent, "utf-8");

    if (boundedContent.length < content.length) {
      input.truncatedFiles.push({
        originalChars: content.length,
        relativePath: normalizePath(entryRelativePath),
        writtenChars: boundedContent.length,
      });
    }
  }
};

export const prepareBoundedScanInput = async (input: {
  maxFileChars: number;
  sourceDir: string;
  workspaceDir: string;
}): Promise<PrepareBoundedScanInputResult> => {
  const scanDir = path.join(input.workspaceDir, "bounded-scan-input");
  const truncatedFiles: TruncatedScanInputFile[] = [];

  await fs.rm(scanDir, { force: true, recursive: true });
  await copyBoundedEntry({
    destinationDir: scanDir,
    maxFileChars: input.maxFileChars,
    relativePath: "",
    sourceDir: input.sourceDir,
    truncatedFiles,
  });

  return { scanDir, truncatedFiles };
};
