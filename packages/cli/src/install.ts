import { mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createGzipDecoder, unpackTar } from "modern-tar";

import type { ApiClient } from "./api-client";
import { CliError } from "./errors";
import { readLockfile, setLockedSkill, writeLockfile } from "./lockfile";
import type { AgentTarget } from "./targets";
import type { SnapshotInstallResolution } from "./types";

const parseInstallSpecifier = (specifier: string) => {
  const atIndex = specifier.lastIndexOf("@");
  if (atIndex > 0 && atIndex < specifier.length - 1) {
    return {
      skill: specifier.slice(0, atIndex),
      version: specifier.slice(atIndex + 1),
    };
  }
  return { skill: specifier };
};

const hashBytes = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const isSafeArchiveName = (name: string) => {
  const normalized = name.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) {
    return false;
  }
  return !normalized.split("/").some((part) => part === "..");
};

const assertInside = (parent: string, child: string) => {
  const relativePath = relative(parent, child);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new CliError(`Archive entry escapes target directory: ${child}`);
  }
};

export const extractSkillArchive = async (input: {
  archiveBytes: Uint8Array;
  skillDir: string;
}) => {
  const absoluteSkillDir = resolve(input.skillDir);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input.archiveBytes);
      controller.close();
    },
  });
  const entries = await unpackTar(body.pipeThrough(createGzipDecoder()));
  const files = [];
  for (const entry of entries) {
    if (entry.header.type && entry.header.type !== "file") {
      continue;
    }
    if (!isSafeArchiveName(entry.header.name)) {
      throw new CliError(`Unsafe archive path: ${entry.header.name}`);
    }
    const outputPath = resolve(absoluteSkillDir, entry.header.name);
    assertInside(absoluteSkillDir, outputPath);
    files.push({ data: entry.data ?? new Uint8Array(), outputPath });
  }

  await rm(absoluteSkillDir, { force: true, recursive: true });
  await mkdir(absoluteSkillDir, { recursive: true });

  for (const { data, outputPath } of files) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, data);
  }

  return { filesCount: files.length, skillDir: absoluteSkillDir };
};

export const installSkill = async (input: {
  apiClient: ApiClient;
  cwd: string;
  lockfilePath?: string;
  skillsDir: string;
  specifier: string;
  target: AgentTarget;
}) => {
  const parsed = parseInstallSpecifier(input.specifier);
  const resolution = await input.apiClient.resolveInstall(parsed);
  if (!resolution.archive.available || !resolution.archive.downloadUrl) {
    throw new CliError(`Archive is not available for ${input.specifier}`);
  }
  const archiveBytes = await input.apiClient.downloadArchive(resolution.archive.downloadUrl);
  const skillName = resolution.skill.slug || parsed.skill;
  const installDir = join(input.skillsDir, skillName);
  const extracted = await extractSkillArchive({
    archiveBytes,
    skillDir: installDir,
  });
  const archiveHash = hashBytes(archiveBytes);
  const lockfile = await readLockfile(input.cwd, input.lockfilePath);
  await writeLockfile(
    input.cwd,
    setLockedSkill(lockfile, skillName, {
      ...resolution.lockEntry,
      computedHash: resolution.lockEntry.computedHash || resolution.snapshot.hash || archiveHash,
      skillPath: resolution.lockEntry.skillPath || resolution.snapshot.entryPath,
      version: resolution.snapshot.version,
    }),
    input.lockfilePath,
  );

  return {
    ...extracted,
    hash: archiveHash,
    skillName,
    target: input.target.name,
    version: resolution.snapshot.version,
  };
};

export const updateSkills = async (input: {
  apiClient: ApiClient;
  cwd: string;
  lockfilePath?: string;
  onlySkill?: string;
  skillsDir: string;
  target: AgentTarget;
}) => {
  const lockfile = await readLockfile(input.cwd, input.lockfilePath);
  const names = Object.keys(lockfile.skills).filter(
    (name) => !input.onlySkill || name === input.onlySkill,
  );
  if (input.onlySkill && names.length === 0) {
    throw new CliError(`Locked skill not found: ${input.onlySkill}`, 4);
  }

  const updated = [];
  for (const name of names) {
    const existing = lockfile.skills[name];
    const next = await input.apiClient.resolveInstall({ skill: name });
    if (
      existing?.version === next.snapshot.version &&
      existing.computedHash === next.lockEntry.computedHash
    ) {
      continue;
    }
    const result = await installSkill({
      apiClient: input.apiClient,
      cwd: input.cwd,
      lockfilePath: input.lockfilePath,
      skillsDir: input.skillsDir,
      specifier: name,
      target: input.target,
    });
    updated.push(result);
  }
  return updated;
};

export type { SnapshotInstallResolution };
