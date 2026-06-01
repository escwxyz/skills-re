import { readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { CliError } from "./errors";
import { readLockfile } from "./lockfile";
import { readSkillMetadataFile } from "./skill-md";
import type { InstalledSkill } from "./types";

const withinDir = (root: string, filePath: string): boolean => {
  const rel = relative(resolve(root), resolve(filePath));
  return !rel.startsWith("..") && !isAbsolute(rel);
};

const candidateSkillPaths = (skillsDir: string, name: string, skillPath?: string) => {
  const paths = [
    join(skillsDir, name, "SKILL.md"),
    join(skillsDir, name, "skill.md"),
    join(skillsDir, name, "README.md"),
  ];
  if (skillPath) {
    for (const candidate of [join(skillsDir, name, skillPath), join(skillsDir, skillPath)]) {
      if (withinDir(skillsDir, candidate)) {
        paths.unshift(candidate);
      }
    }
  }
  return paths;
};

export const findInstalledSkill = async (
  cwd: string,
  skillsDir: string,
  name: string,
  lockfilePath?: string,
): Promise<InstalledSkill> => {
  const lockfile = await readLockfile(cwd, lockfilePath);
  const entry = lockfile.skills[name];
  const tried = candidateSkillPaths(skillsDir, name, entry?.skillPath);
  for (const filePath of tried) {
    try {
      const { metadata } = await readSkillMetadataFile(filePath);
      return {
        baseDir: dirname(filePath),
        description: metadata?.description ?? entry?.source ?? "",
        lockName: name,
        name: metadata?.name ?? name,
        skillFilePath: filePath,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  const available = new Set(Object.keys(lockfile.skills));
  try {
    for (const directory of await readdir(skillsDir)) {
      available.add(directory);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const suffix =
    available.size > 0 ? ` Available skills: ${[...available].toSorted().join(", ")}` : "";
  throw new CliError(`Installed skill not found: ${name}.${suffix}`, 4);
};

export const readInstalledSkillContent = async (
  cwd: string,
  skillsDir: string,
  name: string,
  lockfilePath?: string,
) => {
  const skill = await findInstalledSkill(cwd, skillsDir, name, lockfilePath);
  const { content } = await readSkillMetadataFile(skill.skillFilePath);
  return `<skill_base_dir>${skill.baseDir}</skill_base_dir>\n\n${content}`;
};

export const listInstalledSkillMetadata = async (
  cwd: string,
  skillsDir: string,
  lockfilePath?: string,
) => {
  const lockfile = await readLockfile(cwd, lockfilePath);
  const entries = await Promise.all(
    Object.entries(lockfile.skills).map(async ([name, entry]) => {
      try {
        return await findInstalledSkill(cwd, skillsDir, name, lockfilePath);
      } catch {
        return {
          baseDir: join(skillsDir, name),
          description: entry.source,
          lockName: name,
          name,
          skillFilePath: join(skillsDir, name, "SKILL.md"),
        } satisfies InstalledSkill;
      }
    }),
  );
  return entries.toSorted((left, right) => left.name.localeCompare(right.name));
};
