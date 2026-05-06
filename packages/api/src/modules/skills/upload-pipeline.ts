import { normalizeDirectoryPath } from "../repos/directory-path";
import type { SkillsUploadContentPayload } from "../../types";

export const truncateUploadCommitMessage = (value: string | null | undefined) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length <= 280) {
    return normalized;
  }
  return `${normalized.slice(0, 279)}…`;
};

export const normalizeUploadDirectoryPath = (value: string) =>
  normalizeDirectoryPath(value).replaceAll(/\/+/g, "/");

export const normalizeUploadEntryPath = (value: string) => value.trim();

export const hashSnapshotFiles = async (files: { content: string; path: string }[]) => {
  const serialized = JSON.stringify(
    [...files]
      .map((file) => ({
        content: file.content,
        path: file.path,
      }))
      .toSorted((left, right) => left.path.localeCompare(right.path)),
  );
  const encoded = new TextEncoder().encode(serialized);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export type PreparedUploadSkill = SkillsUploadContentPayload["skills"][number] & {
  snapshotHash: string;
};

export const prepareUploadSkills = async (skills: SkillsUploadContentPayload["skills"]) =>
  await Promise.all(
    skills.map(async (skill) => ({
      ...skill,
      snapshotHash: await hashSnapshotFiles(skill.initialSnapshot.files),
    })),
  );

export const resolveUploadSkillSlug = async (input: {
  checkSkillExistingBySlug: (slug: string) => Promise<boolean>;
  preferredSlug: string;
  usedSlugs: Set<string>;
}) => {
  const baseSlug = input.preferredSlug.trim();
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    if (!(input.usedSlugs.has(candidate) || (await input.checkSkillExistingBySlug(candidate)))) {
      input.usedSlugs.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
};
