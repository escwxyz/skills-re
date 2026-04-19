import { toSearchSkillItem, type SearchSkillRow } from "../shared/search-skill";
import {
  generateSkillCategoriesBatch as generateSkillCategoriesBatchImpl,
  skillCategorySlugSchema,
  type SkillCategoryDefinition,
} from "./ai-categorization";
import type { AiTaskRuntime } from "../ai/runtime";
import { asCategoryId, asSkillId } from "@skills-re/db/utils";
import type { CategoryId } from "@skills-re/db/utils";

type CategoryListRow = {
  count: number;
  description: string;
  id: string;
  name: string;
  slug: string;
  status?: "active" | "deprecated";
};

type CategoriesServiceDeps = {
  countCategories: () => Promise<number>;
  computeSkillCountForCategory: (categoryId: CategoryId) => Promise<number>;
  findCategoryBySlug: (slug: string) => Promise<CategoryListRow | null>;
  getRelatedTagsByCategorySlug: (slug: string) => Promise<{ count: number; slug: string }[]>;
  getTopSkillsByCategorySlug: (slug: string) => Promise<SearchSkillRow[]>;
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
    aiTasks?: AiTaskRuntime
  ) => Promise<{
    items: {
      confidence: number;
      key: string;
      primaryCategory: string;
      reasoning: string;
      scores: Record<string, number>;
    }[];
  }>;
  listSkillCategorizationTargetsByIds: (skillIds: string[]) => Promise<{
    categoryId: string | null;
    description: string;
    id: string;
    tags: string[];
    title: string;
  }[]>;
  listCategories: (input?: { all?: boolean; limit?: number }) => Promise<CategoryListRow[]>;
  listCategoriesForAi: (input?: { limit?: number }) => Promise<string[]>;
  listDefinitionsForAi: () => Promise<SkillCategoryDefinition[]>;
  patchCategoryCount: (input: { categoryId: CategoryId; count: number }) => Promise<void>;
  updateSkillCategory: (input: { categoryId: string | null; skillId: string }) => Promise<void>;
};

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
        }
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
    listDefinitionsForAi: async () =>
      (
        await repo.listCategoryDefinitions({
          statuses: ["active", "deprecated"],
        })
      ).map((category) => ({
        description: category.description,
        keywords: JSON.parse(category.keywords) as string[],
        name: category.name,
        slug: category.slug as SkillCategoryDefinition["slug"],
      })),
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

  const categoriesService = {
    async countCategories() {
      const countCategories = overrides.countCategories ?? (await getDefaultDeps()).countCategories;
      return await countCategories();
    },

    async getCategoryBySlug(input: { slug: string }) {
      const findCategoryBySlug =
        overrides.findCategoryBySlug ?? (await getDefaultDeps()).findCategoryBySlug;
      const row = await findCategoryBySlug(input.slug);
      if (!(row && row.status === "active")) {
        return null;
      }

      const getRelatedTagsByCategorySlug =
        overrides.getRelatedTagsByCategorySlug ??
        (await getDefaultDeps()).getRelatedTagsByCategorySlug;
      const getTopSkillsByCategorySlug =
        overrides.getTopSkillsByCategorySlug ??
        (await getDefaultDeps()).getTopSkillsByCategorySlug;

      const relatedTags = await getRelatedTagsByCategorySlug(input.slug);
      const topSkills = await getTopSkillsByCategorySlug(input.slug);

      return {
        count: row.count,
        description: row.description,
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
      const listCategories = overrides.listCategories ?? (await getDefaultDeps()).listCategories;
      return (await listCategories(input))
        .filter((row) => row.status === "active")
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.slug.localeCompare(right.slug);
        });
    },

    async listCategoriesForAi(input?: { limit?: number }) {
      const listCategoriesForAi =
        overrides.listCategoriesForAi ?? (await getDefaultDeps()).listCategoriesForAi;
      return (await listCategoriesForAi(input)).filter((slug) => typeof slug === "string");
    },

    async recomputeCount(categoryId: string) {
      const computeSkillCountForCategory =
        overrides.computeSkillCountForCategory ??
        (await getDefaultDeps()).computeSkillCountForCategory;
      const patchCategoryCount =
        overrides.patchCategoryCount ?? (await getDefaultDeps()).patchCategoryCount;
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

    async runSkillsCategorizationPipeline(
      input: { skillIds: string[] },
      aiTasks?: AiTaskRuntime
    ) {
      const skillIds = [...new Set(input.skillIds.map((skillId) => skillId.trim()).filter(Boolean))];
      if (skillIds.length === 0) {
        return { failedCount: 0, updatedCount: 0 };
      }

      const listSkillCategorizationTargetsByIds =
        overrides.listSkillCategorizationTargetsByIds ??
        (await getDefaultDeps()).listSkillCategorizationTargetsByIds;
      const generateSkillCategoriesBatch =
        overrides.generateSkillCategoriesBatch ?? (await getDefaultDeps()).generateSkillCategoriesBatch;
      const updateSkillCategory =
        overrides.updateSkillCategory ?? (await getDefaultDeps()).updateSkillCategory;
      const findCategoryBySlug =
        overrides.findCategoryBySlug ?? (await getDefaultDeps()).findCategoryBySlug;
      const listDefinitionsForAi =
        overrides.listDefinitionsForAi ?? (await getDefaultDeps()).listDefinitionsForAi;

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
        aiTasks
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
  return await (await createCategoriesService()).countCategories();
}

export async function listCategoriesPublic(input?: { all?: boolean; limit?: number }) {
  return await (await createCategoriesService()).listCategories(input);
}

export async function getCategoryBySlug(input: { slug: string }) {
  return await (await createCategoriesService()).getCategoryBySlug(input);
}

export async function listCategoriesForAiPublic(input?: { limit?: number }) {
  return await (await createCategoriesService()).listCategoriesForAi(input);
}

export async function runSkillsCategorizationPipeline(
  input: { skillIds: string[] },
  aiTasks?: AiTaskRuntime
) {
  return await (await createCategoriesService()).runSkillsCategorizationPipeline(
    input,
    aiTasks
  );
}
