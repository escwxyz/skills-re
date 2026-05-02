import { toSearchSkillItem } from "../shared/search-skill";
import type { SearchSkillRow } from "../shared/search-skill";
import { createDepGetter } from "../shared/deps";
import type { CategorySlug } from "../categories/taxonomy";

import { getIndexableTagMinCount, isTagIndexable } from "./indexable";
import {
  generateSkillTagsBatch as generateSkillTagsBatchImpl,
  normalizeSkillTags,
} from "./ai-tagging";
import type { NewTagCandidate, SkillTaggingInputItem } from "./ai-tagging";
import type { AiTaskRuntime } from "../ai/runtime";
import type { TagId } from "@skills-re/db/utils";
import { asSkillId } from "@skills-re/db/utils";

interface TagListRow {
  count: number;
  id: string;
  slug: string;
  status?: "active" | "pending";
}

interface TaggingTargetRow {
  description: string;
  id: string;
  latestSnapshotEntryPath: string;
  latestSnapshotId: string;
  title: string;
}

type TagDetailRow = TagListRow;

interface TagsServiceDeps {
  countTags: () => Promise<number>;
  generateSkillTagsBatch: (
    input: {
      existingTagCandidates?: string[];
      items: SkillTaggingInputItem[];
    },
    aiTasks?: AiTaskRuntime,
  ) => Promise<{
    items: {
      confidence: number;
      key: string;
      newTagCandidates: NewTagCandidate[];
      reason: string;
      tags: string[];
    }[];
  }>;
  findTagBySlug: (slug: string) => Promise<TagDetailRow | null>;
  getRelatedCategoriesByTagSlug: (
    slug: string,
  ) => Promise<{ count: number; name: string; slug: CategorySlug }[]>;
  getRelatedTagsByTagSlug: (slug: string) => Promise<{ count: number; slug: string }[]>;
  getTopSkillsByTagSlug: (slug: string) => Promise<SearchSkillRow[]>;
  listSkillIdsWithoutTags: (input?: { limit?: number }) => Promise<string[]>;
  listSkillTaggingTargetsByIds: (skillIds: string[]) => Promise<TaggingTargetRow[]>;
  listIndexableTags: (limit?: number) => Promise<TagListRow[]>;
  listTags: (input?: { all?: boolean; limit?: number }) => Promise<TagListRow[]>;
  listTagsForSeo: (limit?: number) => Promise<TagListRow[]>;
  computeSkillCountForTag: (tagId: TagId) => Promise<number>;
  readSnapshotFileContent: (input: {
    maxBytes?: number;
    path: string;
    snapshotId: string;
  }) => Promise<{ content: string }>;
  patchTagCount: (input: { count: number; tagId: TagId }) => Promise<void>;
  syncSkillTags: (input: {
    createMissingStatus?: "active" | "pending";
    skillId: string;
    tags: string[];
  }) => Promise<string[]>;
}

export type RunSkillsTaggingPipelineOverrides = Partial<
  Pick<TagsServiceDeps, "readSnapshotFileContent">
>;

const createDefaultTagsDeps = async (): Promise<TagsServiceDeps> => {
  const repo = await import("./repo");
  const snapshots = await import("../snapshots/service");
  return {
    countTags: repo.countTags,
    generateSkillTagsBatch: async (input, aiTasks) =>
      await generateSkillTagsBatchImpl(
        input,
        aiTasks ?? {
          getModel: () => {
            throw new Error("AI tagging runtime is unavailable.");
          },
        },
      ),
    findTagBySlug: repo.findTagBySlug,
    getRelatedCategoriesByTagSlug: repo.getRelatedCategoriesByTagSlug,
    getRelatedTagsByTagSlug: repo.getRelatedTagsByTagSlug,
    getTopSkillsByTagSlug: repo.getTopSkillsByTagSlug,
    computeSkillCountForTag: repo.computeSkillCountForTag,
    listSkillIdsWithoutTags: repo.listSkillIdsWithoutTags,
    listSkillTaggingTargetsByIds: async (skillIds) =>
      await repo.listSkillTaggingTargetsByIds(skillIds.map((skillId) => asSkillId(skillId))),
    listIndexableTags: repo.listIndexableTags,
    listTags: repo.listTags,
    listTagsForSeo: repo.listTagsForSeo,
    readSnapshotFileContent: snapshots.readSnapshotFileContent,
    patchTagCount: repo.patchTagCount,
    syncSkillTags: async (input) => {
      const {
        addSkillTagLinks,
        computeSkillCountForTag,
        findTagsBySlugs,
        getSkillById,
        listSkillTagLinks,
        patchSkillSyncTime,
        insertTag,
        patchTagCount,
        removeSkillTagLinks,
      } = await import("./repo");

      const skillId = asSkillId(input.skillId);
      const skill = await getSkillById(skillId);
      if (!skill) {
        throw new Error("Skill not found.");
      }

      const normalizedTags = normalizeSkillTags(input.tags ?? []);
      const existingTags = await listSkillTagLinks(skillId);
      const existingTagIds = new Set(existingTags.map((item) => item.tagId));
      const tagDocs = normalizedTags.length ? await findTagsBySlugs(normalizedTags) : [];
      const slugToId = new Map(tagDocs.map((tag) => [tag.slug, tag.id]));

      for (const slug of normalizedTags) {
        if (!slugToId.has(slug)) {
          const createdId = await insertTag({
            promotedAt: input.createMissingStatus === "pending" ? null : Date.now(),
            slug,
            status: input.createMissingStatus ?? "active",
          });
          if (createdId) {
            slugToId.set(slug, createdId);
            continue;
          }
          const existing = await findTagsBySlugs([slug]);
          const [existingTag] = existing;
          if (existingTag) {
            slugToId.set(slug, existingTag.id);
          }
        }
      }

      const desiredTagIds = normalizedTags
        .map((slug) => slugToId.get(slug))
        .filter((value): value is TagId => value !== null);
      const desiredSet = new Set(desiredTagIds);
      const add = desiredTagIds.filter((id) => !existingTagIds.has(id));
      const remove = [...existingTagIds].filter((id) => !desiredSet.has(id));

      if (add.length > 0) {
        await addSkillTagLinks({
          skillId,
          tagIds: add,
        });
      }

      if (remove.length > 0) {
        await removeSkillTagLinks({
          skillId,
          tagIds: remove,
        });
      }

      if (add.length > 0 || remove.length > 0) {
        await patchSkillSyncTime(skillId, Date.now());
        const impacted = [...new Set([...existingTagIds, ...desiredTagIds])];
        for (const impactedTagId of impacted) {
          const nextCount = await computeSkillCountForTag(impactedTagId);
          await patchTagCount({
            count: nextCount,
            tagId: impactedTagId,
          });
        }
      }

      return normalizedTags;
    },
  };
};

const DEFAULT_NEW_TAG_MATCH_SCORE_THRESHOLD = 0.9;

export const createTagsService = (overrides: Partial<TagsServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<TagsServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultTagsDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  const tagsService = {
    async count() {
      const countTags = await getDep("countTags");
      return await countTags();
    },

    async getBySlug(input: { slug: string }) {
      const findTagBySlug = await getDep("findTagBySlug");
      const row = await findTagBySlug(input.slug);
      if (!(row && row.status === "active")) {
        return null;
      }

      const getRelatedCategoriesByTagSlug = await getDep("getRelatedCategoriesByTagSlug");
      const getRelatedTagsByTagSlug = await getDep("getRelatedTagsByTagSlug");
      const getTopSkillsByTagSlug = await getDep("getTopSkillsByTagSlug");
      const minCount = getIndexableTagMinCount();

      const [relatedCategories, relatedTags, topSkills] = await Promise.all([
        getRelatedCategoriesByTagSlug(input.slug),
        getRelatedTagsByTagSlug(input.slug),
        getTopSkillsByTagSlug(input.slug),
      ]);

      return {
        count: row.count,
        id: row.id,
        indexable: isTagIndexable(row.count, minCount),
        relatedCategories: relatedCategories.map((related) => ({
          count: related.count,
          name: related.name,
          slug: related.slug,
        })),
        relatedTags: relatedTags.map((related) => ({
          count: related.count,
          slug: related.slug,
        })),
        slug: row.slug,
        topSkills: topSkills.map(toSearchSkillItem),
      };
    },

    async list(input?: { all?: boolean; limit?: number }) {
      const listTags = await getDep("listTags");
      const rows = await listTags(input);
      return rows
        .filter((row) => row.status === "active")
        .toSorted((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.slug.localeCompare(right.slug);
        });
    },

    async listForSeo(input?: { limit?: number }) {
      const listTagsForSeo = await getDep("listTagsForSeo");
      const rows = await listTagsForSeo(input?.limit);
      return rows.filter((row) => row.status === "active");
    },

    async listIndexable(input?: { limit?: number; minCount?: number }) {
      const listIndexableTags = await getDep("listIndexableTags");
      const minCount = input?.minCount ?? getIndexableTagMinCount();
      const rows = await listIndexableTags(input?.limit);
      return rows.filter((row) => row.status === "active" && isTagIndexable(row.count, minCount));
    },

    async syncSkillTags(input: {
      createMissingStatus?: "active" | "pending";
      skillId: string;
      tags: string[];
    }) {
      const syncFn = await getDep("syncSkillTags");
      return await syncFn(input);
    },

    async syncSkillTagsFromAi(input: {
      skillId: string;
      existingTags?: string[];
      newTagMatchScoreThreshold?: number;
      newTags?: { slug: string; matchScore: number }[];
    }) {
      const existingTags = normalizeSkillTags(input.existingTags ?? []);
      const threshold = input.newTagMatchScoreThreshold ?? DEFAULT_NEW_TAG_MATCH_SCORE_THRESHOLD;
      const acceptedNewTags = (input.newTags ?? [])
        .filter((item) => item.matchScore >= threshold)
        .map((item) => item.slug);

      return await tagsService.syncSkillTags({
        createMissingStatus: "active",
        skillId: input.skillId,
        tags: [...existingTags, ...acceptedNewTags],
      });
    },

    async recomputeCount(tagId: string) {
      const computeSkillCountForTag = await getDep("computeSkillCountForTag");
      const patchTagCount = await getDep("patchTagCount");
      const typedTagId = tagId as TagId;
      const nextCount = await computeSkillCountForTag(typedTagId);
      await patchTagCount({
        count: nextCount,
        tagId: typedTagId,
      });
      return nextCount;
    },

    async onSkillTagsChanged(event: { nextTagIds: TagId[]; previousTagIds: TagId[] }) {
      const nextIds = new Set(event.nextTagIds);
      const previousIds = new Set(event.previousTagIds);
      const impacted = [...new Set([...previousIds, ...nextIds])];
      for (const tagId of impacted) {
        await tagsService.recomputeCount(tagId);
      }
    },

    async runSkillsTaggingPipeline(input: { skillIds: string[] }, aiTasks?: AiTaskRuntime) {
      const skillIds = [
        ...new Set(input.skillIds.map((skillId) => skillId.trim()).filter(Boolean)),
      ];
      if (skillIds.length === 0) {
        return { failedCount: 0, updatedCount: 0 };
      }

      const listSkillTaggingTargetsByIds = await getDep("listSkillTaggingTargetsByIds");
      const readSnapshotFileContent = await getDep("readSnapshotFileContent");
      const generateSkillTagsBatch = await getDep("generateSkillTagsBatch");
      const listTags = await getDep("listTags");

      const targets = await listSkillTaggingTargetsByIds(skillIds);
      if (targets.length === 0) {
        return { failedCount: 0, updatedCount: 0 };
      }

      const tagList = await listTags({ limit: 50 });
      const existingTagCandidates = tagList.map((tag) => tag.slug);

      const items = await Promise.all(
        targets.map(async (target) => {
          const snapshotContent = await readSnapshotFileContent({
            maxBytes: 6000,
            path: target.latestSnapshotEntryPath,
            snapshotId: target.latestSnapshotId,
          });

          return {
            content: snapshotContent.content,
            description: target.description,
            key: target.id,
            title: target.title,
          };
        }),
      );

      let updatedCount = 0;
      let failedCount = 0;
      const targetById = new Map(targets.map((target) => [target.id, target]));

      const generated = await generateSkillTagsBatch(
        {
          existingTagCandidates,
          items,
        },
        aiTasks,
      );

      for (const label of generated.items) {
        const target = targetById.get(label.key);
        if (!target) {
          failedCount += 1;
          continue;
        }

        const newTagSlugSet = new Set(label.newTagCandidates.map((candidate) => candidate.slug));
        const reusedExistingTags = label.tags.filter((tag) => !newTagSlugSet.has(tag));
        await tagsService.syncSkillTagsFromAi({
          existingTags: reusedExistingTags,
          newTagMatchScoreThreshold: DEFAULT_NEW_TAG_MATCH_SCORE_THRESHOLD,
          newTags: label.newTagCandidates,
          skillId: target.id,
        });
        updatedCount += 1;
      }

      return { failedCount, updatedCount };
    },
  };

  return tagsService;
};

export async function countTagsPublic() {
  return await createTagsService().count();
}

export async function listTagsPublic(input?: { all?: boolean; limit?: number }) {
  return await createTagsService().list(input);
}

export async function getTagBySlug(input: { slug: string }) {
  return await createTagsService().getBySlug(input);
}

export async function listTagsForSeoPublic(input?: { limit?: number }) {
  return await createTagsService().listForSeo(input);
}

export async function listIndexableTagsPublic(input?: { limit?: number; minCount?: number }) {
  return await createTagsService().listIndexable(input);
}

export async function syncSkillTags(input: {
  createMissingStatus?: "active" | "pending";
  skillId: string;
  tags: string[];
}) {
  return await createTagsService().syncSkillTags(input);
}

export async function syncSkillTagsFromAi(input: {
  existingTags?: string[];
  newTagMatchScoreThreshold?: number;
  newTags?: { slug: string; matchScore: number }[];
  skillId: string;
}) {
  return await createTagsService().syncSkillTagsFromAi(input);
}

export async function runSkillsTaggingPipeline(
  input: { skillIds: string[] },
  aiTasks?: AiTaskRuntime,
  overrides: RunSkillsTaggingPipelineOverrides = {},
) {
  return await createTagsService(overrides).runSkillsTaggingPipeline(input, aiTasks);
}
