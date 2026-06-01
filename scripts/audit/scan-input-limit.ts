import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
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
  relativePath: string;
  writtenChars: number;
}

export interface PrepareBoundedScanInputResult {
  scanDir: string;
  truncatedFiles: TruncatedScanInputFile[];
}

const normalizePath = (value: string) => value.replaceAll("\\", "/");

type BoundedReadStream = AsyncIterable<string | Buffer> & {
  destroy: () => void;
};

export const readBoundedText = async (
  filePath: string,
  maxFileChars: number,
  openReadStream: (
    filePath: string,
    options: { encoding: "utf-8"; highWaterMark: number },
  ) => BoundedReadStream = createReadStream,
) => {
  const contentLimit =
    maxFileChars > TRUNCATION_NOTICE.length
      ? maxFileChars - TRUNCATION_NOTICE.length
      : maxFileChars;
  const stream = openReadStream(filePath, {
    encoding: "utf-8",
    highWaterMark: Math.max(1, Math.min(maxFileChars, 64 * 1024)),
  });

  let content = "";
  let truncated = false;

  try {
    for await (const chunk of stream) {
      const chunkText = typeof chunk === "string" ? chunk : String(chunk);
      if (content.length >= contentLimit) {
        truncated = true;
        break;
      }

      const remaining = contentLimit - content.length;
      if (chunkText.length <= remaining) {
        content += chunkText;
        continue;
      }

      content += chunkText.slice(0, remaining);
      truncated = true;
      break;
    }
  } finally {
    stream.destroy();
  }

  if (!truncated) {
    return { content, truncated };
  }

  if (maxFileChars <= TRUNCATION_NOTICE.length) {
    return { content: content.slice(0, maxFileChars), truncated };
  }

  return { content: `${content}${TRUNCATION_NOTICE}`, truncated };
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
    const { content: boundedContent, truncated } = await readBoundedText(
      sourceFilePath,
      input.maxFileChars,
    );

    await fs.mkdir(path.dirname(destinationFilePath), { recursive: true });
    await fs.writeFile(destinationFilePath, boundedContent, "utf-8");

    if (truncated) {
      input.truncatedFiles.push({
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
