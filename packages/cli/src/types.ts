export type OutputMode = "human" | "json";

export interface GlobalOptions {
  json: boolean;
  yes: boolean;
}

export interface CommandContext {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stderr: NodeJS.WritableStream;
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WritableStream;
}

export interface SkillLockEntry {
  computedHash: string;
  source: string;
  sourceType: "github" | "local" | "registry" | string;
  skillPath?: string;
  version?: string;
}

export interface SkillsLockfile {
  skills: Record<string, SkillLockEntry>;
  version: number;
}

export interface SearchSkillItem {
  authorHandle?: string;
  description: string;
  id: string;
  latestSnapshotId?: string;
  latestVersion?: string;
  repoName?: string;
  repoUrl?: string;
  slug: string;
  title: string;
}

export interface SearchSkillsResult {
  continueCursor: string;
  isDone: boolean;
  page: SearchSkillItem[];
}

export interface SnapshotInstallResolution {
  archive: {
    available: boolean;
    downloadUrl?: string;
    fileName?: string;
    size?: number;
  };
  lockEntry: SkillLockEntry;
  skill: {
    authorHandle?: string;
    description: string;
    id: string;
    repoName?: string;
    repoUrl?: string;
    slug: string;
    title: string;
  };
  snapshot: {
    directoryPath: string;
    entryPath: string;
    hash: string;
    id: string;
    version: string;
  };
}

export interface InstalledSkill {
  baseDir: string;
  description: string;
  lockName: string;
  name: string;
  skillFilePath: string;
}
