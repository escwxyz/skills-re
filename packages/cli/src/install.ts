import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
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
      archiveHash: resolution.lockEntry.archiveHash || resolution.snapshot.hash || archiveHash,
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
      existing.archiveHash === next.lockEntry.archiveHash
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

const execFileAsync = promisify(execFile);

export interface GithubSpecifier {
  owner: string;
  repo: string;
  ref?: string;
  skillPath?: string;
}

export const parseGithubSpecifier = (
  specifier: string,
  gitFlag: boolean,
): GithubSpecifier | null => {
  if (/^https?:\/\/github\.com\//i.test(specifier)) {
    try {
      const url = new URL(specifier);
      const parts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
      const [owner, repoRaw, type, ref, ...pathParts] = parts;
      if (!owner || !repoRaw) {
        return null;
      }
      return {
        owner,
        repo: repoRaw.replace(/\.git$/, ""),
        ref: type === "tree" || type === "blob" ? ref : undefined,
        skillPath: pathParts.length > 0 ? pathParts.join("/") : undefined,
      };
    } catch {
      return null;
    }
  }
  if (gitFlag) {
    const parts = specifier.split("/").filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const [owner, repo, ...pathParts] = parts;
    if (!owner || !repo) {
      return null;
    }
    return {
      owner,
      repo,
      skillPath: pathParts.length > 0 ? pathParts.join("/") : undefined,
    };
  }
  return null;
};

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "__pycache__"]);

const hasSkillMd = async (dir: string): Promise<boolean> => {
  try {
    const s = await stat(join(dir, "SKILL.md"));
    return s.isFile();
  } catch {
    return false;
  }
};

const findSkillDirsRecursive = async (dir: string, depth = 0): Promise<string[]> => {
  if (depth > 5) {
    return [];
  }
  try {
    const [hasSkill, entries] = await Promise.all([
      hasSkillMd(dir),
      readdir(dir, { withFileTypes: true }).catch(() => []),
    ]);
    const subResults = await Promise.all(
      entries
        .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
        .map((e) => findSkillDirsRecursive(join(dir, e.name), depth + 1)),
    );
    return [...(hasSkill ? [dir] : []), ...subResults.flat()];
  } catch {
    return [];
  }
};

const PRIORITY_SUBDIRS = ["skills", ".agents/skills", ".claude/skills", ".github/skills"];

const discoverSkillDirs = async (searchRoot: string): Promise<string[]> => {
  if (await hasSkillMd(searchRoot)) {
    return [searchRoot];
  }

  const found: string[] = [];
  const seen = new Set<string>();
  for (const rel of PRIORITY_SUBDIRS) {
    try {
      const entries = await readdir(join(searchRoot, rel), { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const skillDir = join(searchRoot, rel, entry.name);
        if (!seen.has(skillDir) && (await hasSkillMd(skillDir))) {
          found.push(skillDir);
          seen.add(skillDir);
        }
      }
    } catch {
      // subdir doesn't exist
    }
  }
  if (found.length > 0) {
    return found;
  }

  return findSkillDirsRecursive(searchRoot);
};

export const installSkillFromGithub = async (input: {
  apiClient: ApiClient;
  cwd: string;
  gitSpecifier: GithubSpecifier;
  lockfilePath?: string;
  skillsDir: string;
  target: AgentTarget;
}) => {
  const { owner, repo, ref: urlRef, skillPath } = input.gitSpecifier;
  const repoUrl = `https://github.com/${owner}/${repo}`;

  try {
    await execFileAsync("git", ["--version"]);
  } catch {
    throw new CliError("git is required for GitHub installs. Please install git first.");
  }

  const tempDir = join(tmpdir(), `skills-re-${randomUUID()}`);
  try {
    await execFileAsync(
      "git",
      [
        "-c",
        "filter.lfs.required=false",
        "-c",
        "filter.lfs.smudge=",
        "-c",
        "filter.lfs.clean=",
        "-c",
        "filter.lfs.process=",
        "clone",
        "--depth",
        "1",
        ...(urlRef ? ["--branch", urlRef] : []),
        `${repoUrl}.git`,
        tempDir,
      ],
      {
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1" },
        timeout: 300_000,
      },
    );

    const { stdout: headOut } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: tempDir });
    const commitSha = headOut.trim();

    const searchRoot = skillPath ? join(tempDir, skillPath) : tempDir;
    const skillDirs = await discoverSkillDirs(searchRoot);
    if (skillDirs.length === 0) {
      throw new CliError(`No skills found in ${repoUrl}. Skills require a SKILL.md file.`);
    }

    const now = new Date().toISOString();
    let lockfile = await readLockfile(input.cwd, input.lockfilePath);
    const results = [];

    for (const skillDir of skillDirs) {
      const repoRelPath = relative(tempDir, skillDir);
      const { stdout: treeOut } = await execFileAsync(
        "git",
        ["rev-parse", repoRelPath ? `HEAD:${repoRelPath}` : "HEAD^{tree}"],
        { cwd: tempDir },
      );
      const skillFolderHash = treeOut.trim();
      const skillName = basename(skillDir) === basename(tempDir) ? repo : basename(skillDir);
      const installDir = join(input.skillsDir, skillName);

      await rm(installDir, { force: true, recursive: true });
      await cp(skillDir, installDir, {
        recursive: true,
        filter: (src) => basename(src) !== ".git",
      });

      lockfile = setLockedSkill(lockfile, skillName, {
        source: `${owner}/${repo}`,
        sourceType: "github",
        sourceUrl: repoUrl,
        ref: commitSha,
        skillFolderHash,
        installedAt: lockfile.skills[skillName]?.installedAt ?? now,
        updatedAt: now,
      });
      results.push({ installDir, skillName, target: input.target.name, ref: commitSha });
    }

    await writeLockfile(input.cwd, lockfile, input.lockfilePath);
    input.apiClient.notifyInstall({ repoUrl, ref: commitSha });

    return results;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};
