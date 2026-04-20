import { changelogTypeSchema } from "@skills-re/contract/common/changelog";

interface ChangelogRow {
  changesJson: string[];
  createdAt: number;
  description: string;
  id: string;
  isPublished: boolean;
  isStable: boolean;
  title: string;
  type: "feature" | "patch" | "major";
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}

interface ChangelogsServiceDeps {
  createChangelog: (input: {
    changesJson: string[];
    description: string;
    isPublished: boolean;
    isStable: boolean;
    title: string;
    type: "feature" | "patch" | "major";
    versionMajor: number;
    versionMinor: number;
    versionPatch: number;
  }) => Promise<string>;
  deleteChangelog: (id: string) => Promise<void>;
  getChangelogById: (id: string) => Promise<ChangelogRow | null>;
  hasVersionTripletConflict: (input: {
    excludeId?: string;
    versionMajor: number;
    versionMinor: number;
    versionPatch: number;
  }) => Promise<boolean>;
  listAllChangelogs: (limit: number) => Promise<ChangelogRow[]>;
  listPublishedChangelogs: (limit: number) => Promise<ChangelogRow[]>;
  updateChangelog: (input: {
    changesJson: string[];
    description: string;
    id: string;
    isPublished: boolean;
    isStable: boolean;
    title: string;
    type: "feature" | "patch" | "major";
    versionMajor: number;
    versionMinor: number;
    versionPatch: number;
  }) => Promise<void>;
}

const createDefaultChangelogDeps = async (): Promise<ChangelogsServiceDeps> => {
  const repo = await import("./repo");
  return {
    createChangelog: repo.createChangelog,
    deleteChangelog: repo.deleteChangelog,
    getChangelogById: repo.getChangelogById,
    hasVersionTripletConflict: repo.hasVersionTripletConflict,
    listAllChangelogs: repo.listAllChangelogs,
    listPublishedChangelogs: repo.listPublishedChangelogs,
    updateChangelog: repo.updateChangelog,
  };
};

const toOutputItem = (row: ChangelogRow) => ({
  changes: Array.isArray(row.changesJson)
    ? row.changesJson.filter((value): value is string => typeof value === "string")
    : [],
  createdAt: row.createdAt,
  description: row.description,
  id: row.id,
  isPublished: row.isPublished,
  isStable: row.isStable,
  title: row.title,
  type: changelogTypeSchema.parse(row.type),
  versionMajor: row.versionMajor,
  versionMinor: row.versionMinor,
  versionPatch: row.versionPatch,
});

const ensureVersionPart = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
};

export const createChangelogsService = (overrides: Partial<ChangelogsServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<ChangelogsServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultChangelogDeps();
    return await defaultDepsPromise;
  };

  return {
    async getById(id: string) {
      const getChangelogById =
        overrides.getChangelogById ?? (await getDefaultDeps()).getChangelogById;
      const row = await getChangelogById(id);
      return row ? toOutputItem(row) : null;
    },

    async listAll(input?: { limit?: number }) {
      const listAllChangelogs =
        overrides.listAllChangelogs ?? (await getDefaultDeps()).listAllChangelogs;
      const rows = await listAllChangelogs(input?.limit ?? 100);
      return rows.map(toOutputItem);
    },

    async listPublished(input?: { limit?: number }) {
      const listPublishedChangelogs =
        overrides.listPublishedChangelogs ?? (await getDefaultDeps()).listPublishedChangelogs;
      const rows = await listPublishedChangelogs(input?.limit ?? 20);
      return rows.map(toOutputItem);
    },

    async remove(id: string) {
      const deleteChangelog = overrides.deleteChangelog ?? (await getDefaultDeps()).deleteChangelog;
      await deleteChangelog(id);
      return null;
    },

    async upsert(input: {
      id?: string;
      versionMajor: number;
      versionMinor: number;
      versionPatch: number;
      title: string;
      description: string;
      changes: string[];
      type: "feature" | "patch" | "major";
      isStable?: boolean;
      isPublished?: boolean;
    }) {
      ensureVersionPart(input.versionMajor, "versionMajor");
      ensureVersionPart(input.versionMinor, "versionMinor");
      ensureVersionPart(input.versionPatch, "versionPatch");

      const isStable = input.isStable ?? true;
      const isPublished = input.isPublished ?? true;
      const changesJson = input.changes;

      const hasVersionTripletConflict =
        overrides.hasVersionTripletConflict ?? (await getDefaultDeps()).hasVersionTripletConflict;
      const conflict = await hasVersionTripletConflict({
        excludeId: input.id,
        versionMajor: input.versionMajor,
        versionMinor: input.versionMinor,
        versionPatch: input.versionPatch,
      });
      if (conflict) {
        throw new Error("Version already exists.");
      }

      if (input.id) {
        const updateChangelog =
          overrides.updateChangelog ?? (await getDefaultDeps()).updateChangelog;
        await updateChangelog({
          changesJson,
          description: input.description,
          id: input.id,
          isPublished,
          isStable,
          title: input.title,
          type: input.type,
          versionMajor: input.versionMajor,
          versionMinor: input.versionMinor,
          versionPatch: input.versionPatch,
        });
        return { id: input.id };
      }

      const createChangelog = overrides.createChangelog ?? (await getDefaultDeps()).createChangelog;
      const id = await createChangelog({
        changesJson,
        description: input.description,
        isPublished,
        isStable,
        title: input.title,
        type: input.type,
        versionMajor: input.versionMajor,
        versionMinor: input.versionMinor,
        versionPatch: input.versionPatch,
      });
      return { id };
    },
  };
};

export async function listPublishedChangelogsPublic(input?: { limit?: number }) {
  return await (await createChangelogsService()).listPublished(input);
}

export async function listAllChangelogsPublic(input?: { limit?: number }) {
  return await (await createChangelogsService()).listAll(input);
}

export async function getChangelogByIdPublic(id: string) {
  return await (await createChangelogsService()).getById(id);
}

export async function upsertChangelogPublic(input: {
  id?: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  title: string;
  description: string;
  changes: string[];
  type: "feature" | "patch" | "major";
  isStable?: boolean;
  isPublished?: boolean;
}) {
  return await (await createChangelogsService()).upsert(input);
}

export async function removeChangelogPublic(id: string) {
  return await (await createChangelogsService()).remove(id);
}
