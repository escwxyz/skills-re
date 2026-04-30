import { toSearchSkillItem } from "../shared/search-skill";
import type { SearchSkillRow } from "../shared/search-skill";
import { createDepGetter } from "../shared/deps";
import {
  generateSkillCategoriesBatch as generateSkillCategoriesBatchImpl,
  skillCategorySlugSchema,
} from "./ai-categorization";
import type { SkillCategoryDefinition } from "./ai-categorization";
import { CATEGORY_DEFINITIONS } from "./taxonomy";
import type { AiTaskRuntime } from "../ai/runtime";
import { asCategoryId, asSkillId } from "@skills-re/db/utils";
import type { CategoryId } from "@skills-re/db/utils";

interface CategoryListRow {
  count: number;
  id: string;
  name: string;
  slug: string;
}

type MaybePromise<T> = T | Promise<T>;

interface CategoriesServiceDeps {
  countCategories: () => MaybePromise<number>;
  computeSkillCountForCategory: (categoryId: CategoryId) => MaybePromise<number>;
  findCategoryBySlug: (slug: string) => MaybePromise<CategoryListRow | null>;
  getRelatedTagsByCategorySlug: (slug: string) => MaybePromise<{ count: number; slug: string }[]>;
  getTopSkillsByCategorySlug: (slug: string) => MaybePromise<SearchSkillRow[]>;
  generateSkillCategoriesBatch: (
    input: {
      categories: SkillCategoryDefinition[];
      items: {
        description: string;
        key: string;
        tags: string[];
        title: string;
      }[];
    },
    aiTasks?: AiTaskRuntime,
  ) => MaybePromise<{
    items: {
      confidence: number;
      key: string;
      primaryCategory: string;
      reasoning: string;
      scores: Record<string, number>;
    }[];
  }>;
  listSkillCategorizationTargetsByIds: (skillIds: string[]) => MaybePromise<
    {
      categoryId: string | null;
      description: string;
      id: string;
      tags: string[];
      title: string;
    }[]
  >;
  listCategories: (input?: { all?: boolean; limit?: number }) => MaybePromise<CategoryListRow[]>;
  listCategoriesForAi: (input?: { limit?: number }) => MaybePromise<string[]>;
  listDefinitionsForAi: () => MaybePromise<SkillCategoryDefinition[]>;
  patchCategoryCount: (input: { categoryId: CategoryId; count: number }) => MaybePromise<void>;
  updateSkillCategory: (input: {
    categoryId: string | null;
    skillId: string;
  }) => MaybePromise<void>;
}

const createDefaultCategoriesDeps = async (): Promise<CategoriesServiceDeps> => {
  const repo = await import("./repo");
  const skillsRepo = await import("../skills/repo");
  return {
    countCategories: repo.countCategories,
    computeSkillCountForCategory: repo.computeSkillCountForCategory,
    generateSkillCategoriesBatch: async (input, aiTasks) =>
      await generateSkillCategoriesBatchImpl(
        input,
        aiTasks ?? {
          getModel: () => {
            throw new Error("AI categorization runtime is unavailable.");
          },
        },
      ),
    findCategoryBySlug: repo.findCategoryBySlug,
    getRelatedTagsByCategorySlug: repo.getRelatedTagsByCategorySlug,
    getTopSkillsByCategorySlug: repo.getTopSkillsByCategorySlug,
    listSkillCategorizationTargetsByIds: async (skillIds) =>
      await skillsRepo.listSkillCategorizationTargetsByIds(
        skillIds.map((skillId) => asSkillId(skillId)),
      ),
    listCategories: repo.listCategories,
    listCategoriesForAi: repo.listCategoriesForAi,
    listDefinitionsForAi: () => [...CATEGORY_DEFINITIONS],
    patchCategoryCount: repo.patchCategoryCount,
    updateSkillCategory: skillsRepo.updateSkillCategory,
  };
};

const DEFAULT_CATEGORY_REVIEW_SCORE_THRESHOLD = 7;
const DEFAULT_CATEGORY_OTHER_FALLBACK_THRESHOLD = 4;
const OTHER_CATEGORY_SLUG = skillCategorySlugSchema.enum.other;

const getTopScore = (scores: Record<string, number>) => {
  const ranked = Object.entries(scores).toSorted((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  });
  return ranked[0]?.[1] ?? 0;
};

const decidePrimaryCategorySlug = (input: {
  aiPrimaryCategory: string;
  confidence: number;
  otherFallbackThreshold: number;
  reasoning: string;
  reviewScoreThreshold: number;
  skillId: string;
  topScore: number;
}) => {
  if (input.topScore < input.otherFallbackThreshold) {
    return OTHER_CATEGORY_SLUG;
  }

  if (input.topScore < input.reviewScoreThreshold) {
    console.warn("skills categorization fell back to other (low score)", {
      aiPrimaryCategory: input.aiPrimaryCategory,
      confidence: input.confidence,
      reasoning: input.reasoning,
      skillId: input.skillId,
      topScore: input.topScore,
    });
    return OTHER_CATEGORY_SLUG;
  }

  return input.aiPrimaryCategory;
};

export const createCategoriesService = (overrides: Partial<CategoriesServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<CategoriesServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultCategoriesDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  const categoriesService = {
    async countCategories() {
      const countCategories = await getDep("countCategories");
      return await countCategories();
    },

    async getCategoryBySlug(input: { slug: string }) {
      const findCategoryBySlug = await getDep("findCategoryBySlug");
      const row = await findCategoryBySlug(input.slug);
      if (!row) {
        return null;
      }

      const getRelatedTagsByCategorySlug = await getDep("getRelatedTagsByCategorySlug");
      const getTopSkillsByCategorySlug = await getDep("getTopSkillsByCategorySlug");

      const relatedTags = await getRelatedTagsByCategorySlug(input.slug);
      const topSkills = await getTopSkillsByCategorySlug(input.slug);

      return {
        count: row.count,
        id: row.id,
        name: row.name,
        relatedTags: relatedTags.map((related) => ({
          count: related.count,
          slug: related.slug,
        })),
        slug: row.slug,
        topSkills: topSkills.map(toSearchSkillItem),
      };
    },

    async listCategories(input?: { all?: boolean; limit?: number }) {
      const listCategories = await getDep("listCategories");
      const categories = await listCategories(input);
      return categories.toSorted((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.slug.localeCompare(right.slug);
      });
    },

    async listCategoriesForAi(input?: { limit?: number }) {
      const listCategoriesForAi = await getDep("listCategoriesForAi");
      const categories = await listCategoriesForAi(input);
      return categories.filter((slug) => typeof slug === "string");
    },

    async recomputeCount(categoryId: string) {
      const computeSkillCountForCategory = await getDep("computeSkillCountForCategory");
      const patchCategoryCount = await getDep("patchCategoryCount");
      const typedCategoryId = categoryId as CategoryId;
      const nextCount = await computeSkillCountForCategory(typedCategoryId);
      await patchCategoryCount({
        categoryId: typedCategoryId,
        count: nextCount,
      });
      return nextCount;
    },

    async onSkillCategoryChanged(event: {
      nextCategoryId: CategoryId | null;
      previousCategoryId: CategoryId | null;
    }) {
      const impacted = new Set<CategoryId>();
      if (event.previousCategoryId) {
        impacted.add(event.previousCategoryId);
      }
      if (event.nextCategoryId) {
        impacted.add(event.nextCategoryId);
      }

      for (const categoryId of impacted) {
        await categoriesService.recomputeCount(categoryId);
      }
    },

    async runSkillsCategorizationPipeline(input: { skillIds: string[] }, aiTasks?: AiTaskRuntime) {
      const skillIds = [
        ...new Set(input.skillIds.map((skillId) => skillId.trim()).filter(Boolean)),
      ];
      if (skillIds.length === 0) {
        return { failedCount: 0, updatedCount: 0 };
      }

      const listSkillCategorizationTargetsByIds = await getDep(
        "listSkillCategorizationTargetsByIds",
      );
      const generateSkillCategoriesBatch = await getDep("generateSkillCategoriesBatch");
      const updateSkillCategory = await getDep("updateSkillCategory");
      const findCategoryBySlug = await getDep("findCategoryBySlug");
      const listDefinitionsForAi = await getDep("listDefinitionsForAi");

      const targets = await listSkillCategorizationTargetsByIds(skillIds);
      if (targets.length === 0) {
        return { failedCount: 0, updatedCount: 0 };
      }

      const categoryDefinitions = await listDefinitionsForAi();

      const generated = await generateSkillCategoriesBatch(
        {
          categories: categoryDefinitions,
          items: targets.map((target) => ({
            description: target.description,
            key: target.id,
            tags: target.tags,
            title: target.title,
          })),
        },
        aiTasks,
      );

      let updatedCount = 0;
      let failedCount = 0;

      for (const item of generated.items) {
        const target = targets.find((candidate) => candidate.id === item.key);
        if (!target) {
          failedCount += 1;
          continue;
        }

        const topScore = getTopScore(item.scores);
        const selectedSlug = decidePrimaryCategorySlug({
          aiPrimaryCategory: item.primaryCategory,
          confidence: item.confidence,
          otherFallbackThreshold: DEFAULT_CATEGORY_OTHER_FALLBACK_THRESHOLD,
          reasoning: item.reasoning,
          reviewScoreThreshold: DEFAULT_CATEGORY_REVIEW_SCORE_THRESHOLD,
          skillId: target.id,
          topScore,
        });

        const nextCategory = await findCategoryBySlug(selectedSlug);
        const nextCategoryId = nextCategory?.id ? asCategoryId(nextCategory.id) : null;
        if (nextCategoryId !== target.categoryId) {
          await updateSkillCategory({
            categoryId: nextCategoryId,
            skillId: target.id,
          });
          await categoriesService.onSkillCategoryChanged({
            nextCategoryId,
            previousCategoryId: target.categoryId ? asCategoryId(target.categoryId) : null,
          });
        }
        updatedCount += 1;
      }

      return { failedCount, updatedCount };
    },
  };

  return categoriesService;
};

export async function countCategoriesPublic() {
  const service = createCategoriesService();
  return await service.countCategories();
}

export async function listCategoriesPublic(input?: { all?: boolean; limit?: number }) {
  const service = createCategoriesService();
  return await service.listCategories(input);
}

export async function getCategoryBySlug(input: { slug: string }) {
  const service = createCategoriesService();
  return await service.getCategoryBySlug(input);
}

export async function listCategoriesForAiPublic(input?: { limit?: number }) {
  const service = createCategoriesService();
  return await service.listCategoriesForAi(input);
}

export async function runSkillsCategorizationPipeline(
  input: { skillIds: string[] },
  aiTasks?: AiTaskRuntime,
) {
  const service = createCategoriesService();
  return await service.runSkillsCategorizationPipeline(input, aiTasks);
}
