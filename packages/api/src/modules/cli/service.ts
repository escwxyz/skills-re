// oxlint-disable no-nested-ternary
import type { SearchSkillRow } from "../shared/search-skill";
import type { SnapshotListItem } from "../snapshots/repo";
import { asSkillId, asSnapshotId } from "@skills-re/db/utils";

export interface CliServiceDeps {
  findSkillByPath: (input: {
    authorHandle: string;
    repoName?: string;
    skillSlug: string;
  }) => Promise<SearchSkillRow | null>;
  findSkillBySlug: (slug: string) => Promise<SearchSkillRow | null>;
  getSnapshotById: (snapshotId: string) => Promise<SnapshotListItem | null>;
  getSnapshotBySkillAndVersion: (input: {
    skillId: string;
    version: string;
  }) => Promise<SnapshotListItem | null>;
  listSnapshotsPageBySkill: (input: {
    limit: number;
    skillId: string;
  }) => Promise<{ page: SnapshotListItem[] }>;
}

export interface ResolveCliInstallInput {
  requestHeaders?: Headers;
  skill: string;
  version?: string;
}

const defaultDeps: CliServiceDeps = {
  findSkillByPath: async (input) => {
    const { findSkillByPath } = await import("../skills/repo");
    return await findSkillByPath(input);
  },
  findSkillBySlug: async (slug) => {
    const { findSkillBySlug } = await import("../skills/repo");
    return await findSkillBySlug(slug);
  },
  getSnapshotById: async (snapshotId) => {
    const { getSnapshotById } = await import("../snapshots/repo");
    return await getSnapshotById(asSnapshotId(snapshotId));
  },
  getSnapshotBySkillAndVersion: async (input) => {
    const { getSnapshotBySkillAndVersion } = await import("../snapshots/repo");
    return await getSnapshotBySkillAndVersion({
      skillId: asSkillId(input.skillId),
      version: input.version,
    });
  },
  listSnapshotsPageBySkill: async (input) => {
    const { listSnapshotsPageBySkill } = await import("../snapshots/repo");
    return await listSnapshotsPageBySkill({
      limit: input.limit,
      skillId: asSkillId(input.skillId),
    });
  },
};

const parseSkillIdentifier = (value: string) => {
  const segments = value
    .replaceAll(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  if (segments.length >= 2) {
    return {
      authorHandle: segments[0],
      repoName: segments.length >= 3 ? segments[1] : undefined,
      skillSlug: segments.at(-1),
    };
  }
  return { slug: segments[0] ?? value };
};

const getRequestOrigin = (headers?: Headers) => {
  const explicitOrigin = headers?.get("origin");
  if (explicitOrigin) {
    return new URL(explicitOrigin).origin;
  }
  const host = headers?.get("x-forwarded-host") ?? headers?.get("host");
  if (!host) {
    return "http://localhost";
  }
  const protocol = headers?.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
};

const sanitizeFileName = (value: string) =>
  value
    .replaceAll(/[^a-z0-9-_]+/gi, "-")
    .replaceAll(/^-+|-+$/g, "")
    .toLowerCase();

export const createCliService = (overrides: Partial<CliServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  return {
    async resolveInstall(input: ResolveCliInstallInput) {
      const parsed = parseSkillIdentifier(input.skill);
      const skill =
        "slug" in parsed
          ? await deps.findSkillBySlug(parsed.slug || input.skill)
          : parsed.authorHandle && parsed.skillSlug
            ? await deps.findSkillByPath({
                authorHandle: parsed.authorHandle,
                repoName: parsed.repoName,
                skillSlug: parsed.skillSlug,
              })
            : null;

      if (!skill) {
        throw new Error(`Skill not found: ${input.skill}`);
      }

      let snapshot: SnapshotListItem | null;

      if (input.version) {
        snapshot = await deps.getSnapshotBySkillAndVersion({
          skillId: skill.id,
          version: input.version,
        });
      } else {
        const result = await deps.listSnapshotsPageBySkill({ limit: 1, skillId: skill.id });
        snapshot = result.page[0] ?? null;
      }

      if (!snapshot) {
        throw new Error(
          input.version
            ? `Snapshot not found for ${skill.slug}@${input.version}`
            : `No installable snapshot found for ${skill.slug}`,
        );
      }

      const downloadUrl = new URL("/skills/download", getRequestOrigin(input.requestHeaders));
      downloadUrl.searchParams.set("snapshotId", snapshot.id);
      const source =
        skill.authorHandle && skill.repoName
          ? `${skill.authorHandle}/${skill.repoName}`
          : (skill.repoUrl ?? skill.slug);

      return {
        archive: {
          available: Boolean(snapshot.archiveR2Key),
          downloadUrl: snapshot.archiveR2Key ? downloadUrl.toString() : undefined,
          fileName: `${sanitizeFileName(snapshot.name || skill.slug)}-v${snapshot.version}.tar.gz`,
        },
        lockEntry: {
          computedHash: snapshot.hash,
          source,
          sourceType: "github",
          skillPath: snapshot.entryPath,
          version: snapshot.version,
        },
        skill: {
          authorHandle: skill.authorHandle,
          description: skill.description,
          id: skill.id,
          repoName: skill.repoName,
          repoUrl: skill.repoUrl ?? undefined,
          slug: skill.slug,
          title: skill.title,
        },
        snapshot: {
          directoryPath: snapshot.directoryPath,
          entryPath: snapshot.entryPath,
          hash: snapshot.hash,
          id: snapshot.id,
          version: snapshot.version,
        },
      };
    },
  };
};

export const cliService = createCliService();

export const resolveCliInstall = async (input: ResolveCliInstallInput) =>
  await cliService.resolveInstall(input);
