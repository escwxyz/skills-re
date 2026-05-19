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
  // skills.sh-compatible fields
  source: string;
  sourceType: "github" | "local" | "registry" | string;
  sourceUrl?: string;
  ref?: string;
  skillPath?: string;
  skillFolderHash?: string;
  installedAt?: string;
  updatedAt?: string;
  // our extensions
  archiveHash?: string;
  version?: string;
}

export interface SkillsLockfile {
  skills: Record<string, SkillLockEntry>;
  version: number;
}

export interface SearchSkillItem {
  authorHandle?: string;
  description: string;
  downloadsAllTime?: number;
  downloadsTrending?: number;
  id: string;
  isVerified?: boolean;
  latestAuditScore?: number;
  latestSnapshotId?: string;
  latestVersion?: string;
  primaryCategory?: string;
  repoName?: string;
  repoUrl?: string;
  slug: string;
  stargazerCount?: number;
  staticAudit?: {
    isBlocked: boolean;
    overallScore: number;
    riskLevel: "critical" | "high" | "low" | "medium" | "safe";
    safeToPublish: boolean;
    status: "fail" | "pass";
  };
  tags?: string[];
  title: string;
  viewsAllTime?: number;
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
