// oxlint-disable no-nested-ternary
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { CliError } from "./errors";
import type { SkillLockEntry, SkillsLockfile } from "./types";

export const LOCKFILE_NAME = "skills-lock.json";

export const getLockfilePath = (cwd: string, explicitPath?: string) =>
  explicitPath ?? join(cwd, LOCKFILE_NAME);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseLockEntry = (name: string, value: unknown): SkillLockEntry => {
  if (!isRecord(value)) {
    throw new CliError(`Invalid lock entry for ${name}`);
  }
  if (typeof value.source !== "string" || typeof value.sourceType !== "string") {
    throw new CliError(`Invalid lock entry for ${name}`);
  }
  const now = new Date().toISOString();
  return {
    source: value.source,
    sourceType: value.sourceType,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : undefined,
    ref: typeof value.ref === "string" ? value.ref : undefined,
    skillPath: typeof value.skillPath === "string" ? value.skillPath : undefined,
    skillFolderHash: typeof value.skillFolderHash === "string" ? value.skillFolderHash : undefined,
    installedAt: typeof value.installedAt === "string" ? value.installedAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    // our extensions
    archiveHash:
      typeof value.archiveHash === "string"
        ? value.archiveHash
        : typeof value.computedHash === "string"
          ? value.computedHash
          : undefined,
    version: typeof value.version === "string" ? value.version : undefined,
  };
};

export const parseLockfile = (content: string): SkillsLockfile => {
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.skills)) {
    throw new CliError("Invalid skills-lock.json");
  }
  const skills = Object.fromEntries(
    Object.entries(parsed.skills).map(([name, entry]) => [name, parseLockEntry(name, entry)]),
  );
  return {
    skills,
    version: typeof parsed.version === "number" ? parsed.version : 1,
  };
};

export const readLockfile = async (cwd: string, explicitPath?: string): Promise<SkillsLockfile> => {
  try {
    return parseLockfile(await readFile(getLockfilePath(cwd, explicitPath), "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { skills: {}, version: 1 };
    }
    throw error;
  }
};

export const writeLockfile = async (
  cwd: string,
  lockfile: SkillsLockfile,
  explicitPath?: string,
) => {
  const filePath = getLockfilePath(cwd, explicitPath);
  const sorted: SkillsLockfile = {
    version: lockfile.version,
    skills: Object.fromEntries(
      Object.entries(lockfile.skills).toSorted(([left], [right]) => left.localeCompare(right)),
    ),
  };
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
};

export const setLockedSkill = (
  lockfile: SkillsLockfile,
  name: string,
  entry: SkillLockEntry,
): SkillsLockfile => ({
  version: lockfile.version || 1,
  skills: {
    ...lockfile.skills,
    [name]: {
      ...lockfile.skills[name],
      ...entry,
    },
  },
});
