import { createGzipEncoder, packTar } from "modern-tar";

export interface SnapshotArchiveFileInput {
  content: Uint8Array;
  path: string;
}

export interface SnapshotArchiveTarEntry {
  body: Uint8Array;
  header: {
    name: string;
    size: number;
    type: "file";
  };
}

interface SnapshotArchiveCodecDeps {
  createGzipEncoder: typeof createGzipEncoder;
  packTar: typeof packTar;
}

const defaultCodecDeps: SnapshotArchiveCodecDeps = {
  createGzipEncoder,
  packTar,
};

const normalizeArchivePath = (input: string) => {
  const replaced = input.replaceAll("\\", "/").trim();
  if (replaced.length === 0) {
    throw new Error("File path cannot be empty.");
  }

  const withoutLeadingSlash = replaced.replace(/^\/+/, "");
  if (withoutLeadingSlash.length === 0) {
    throw new Error("File path cannot be empty.");
  }

  const segments = withoutLeadingSlash.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (stack.length === 0) {
        throw new Error(`Invalid file path: ${input}`);
      }
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  if (stack.length === 0) {
    throw new Error(`Invalid file path: ${input}`);
  }

  return stack.join("/");
};

const normalizeDirectoryPath = (input: string) =>
  normalizeArchivePath(input).replaceAll(/\/+$/g, "");

export const buildSnapshotArchiveTarEntries = (input: {
  directoryPath: string;
  files: SnapshotArchiveFileInput[];
}) => {
  const normalizedDirectoryPath = normalizeDirectoryPath(input.directoryPath);
  const directoryPrefix = `${normalizedDirectoryPath}/`;
  return input.files.map((file) => {
    const normalizedPath = normalizeArchivePath(file.path);
    if (normalizedPath === normalizedDirectoryPath) {
      throw new Error(`File path cannot equal the snapshot directory: ${file.path}`);
    }

    if (!normalizedPath.startsWith(directoryPrefix)) {
      throw new Error(`File path must live under the snapshot directory: ${file.path}`);
    }

    const entryPath = normalizedPath.slice(directoryPrefix.length);

    return {
      body: file.content,
      header: {
        name: entryPath,
        size: file.content.byteLength,
        type: "file" as const,
      },
    };
  });
};

const gzipBuffer = async (input: Uint8Array, deps: SnapshotArchiveCodecDeps = defaultCodecDeps) => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
  const compressed = source.pipeThrough(deps.createGzipEncoder());
  const compressedBuffer = await new Response(compressed).arrayBuffer();
  return new Uint8Array(compressedBuffer);
};

export const createSnapshotArchiveBuffer = async (
  entries: SnapshotArchiveTarEntry[],
  deps: SnapshotArchiveCodecDeps = defaultCodecDeps,
) => {
  const tarBuffer = await deps.packTar(entries);
  return await gzipBuffer(tarBuffer, deps);
};

const SNAPSHOT_ARCHIVE_STAGING_PREFIX = "snapshot-archive/staging";

export const buildSnapshotArchiveStagingKey = () => {
  const day = new Date().toISOString().slice(0, 10);
  return `${SNAPSHOT_ARCHIVE_STAGING_PREFIX}/${day}/${crypto.randomUUID()}.tar.gz`;
};
