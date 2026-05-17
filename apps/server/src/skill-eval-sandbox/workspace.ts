export interface SnapshotWorkspaceFile {
  path: string;
  r2Key: string | null;
  size: number;
}

export interface SnapshotWorkspaceStorage {
  getSnapshotFileObject(key: string): Promise<{
    arrayBuffer(): Promise<ArrayBuffer>;
    body?: ReadableStream | null;
  } | null>;
}

export interface SnapshotWorkspaceSandbox {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  writeFile(path: string, content: ArrayBuffer | ReadableStream | Uint8Array): Promise<unknown>;
}

export interface RestoreSnapshotWorkspaceInput {
  directoryPath: string;
  files: SnapshotWorkspaceFile[];
  sandbox: SnapshotWorkspaceSandbox;
  storage: SnapshotWorkspaceStorage;
  workspaceDir?: string;
}

const normalizePath = (input: string) => {
  const normalized = input.replaceAll("\\", "/").trim().replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (stack.length === 0) {
        throw new Error(`Snapshot file path escapes workspace: ${input}`);
      }
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  if (stack.length === 0) {
    throw new Error(`Snapshot file path is empty: ${input}`);
  }
  return stack.join("/");
};

const normalizeDirectory = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  return `${normalizePath(trimmed)}/`;
};

export const toWorkspaceRelativePath = (directoryPath: string, filePath: string) => {
  const normalizedFilePath = normalizePath(filePath);
  const normalizedDirectory = normalizeDirectory(directoryPath);
  if (!normalizedDirectory) {
    return normalizedFilePath;
  }
  if (!normalizedFilePath.startsWith(normalizedDirectory)) {
    throw new Error(`Snapshot file is outside the skill directory: ${filePath}`);
  }
  return normalizedFilePath.slice(normalizedDirectory.length);
};

const dirname = (path: string) => {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
};

export async function restoreSnapshotWorkspace(input: RestoreSnapshotWorkspaceInput) {
  const workspaceDir = input.workspaceDir ?? "/workspace";
  await input.sandbox.mkdir(workspaceDir, { recursive: true });

  const restored: { path: string; size: number }[] = [];
  for (const file of input.files) {
    if (!file.r2Key) {
      continue;
    }

    const relativePath = toWorkspaceRelativePath(input.directoryPath, file.path);
    const workspacePath = `${workspaceDir}/${relativePath}`;
    const parentDir = dirname(workspacePath);
    if (parentDir) {
      await input.sandbox.mkdir(parentDir, { recursive: true });
    }

    const object = await input.storage.getSnapshotFileObject(file.r2Key);
    if (!object) {
      throw new Error(`Snapshot file object is missing: ${file.path}`);
    }

    const content = object.body ?? new Uint8Array(await object.arrayBuffer());
    await input.sandbox.writeFile(workspacePath, content);
    restored.push({
      path: workspacePath,
      size: file.size,
    });
  }

  return { restored };
}
