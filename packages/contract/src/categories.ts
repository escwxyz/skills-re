import { z } from "zod";

import { baseContract } from "./common/base";
import {
  categoryDetailSchema,
  categoryListItemSchema,
  categoryTopSkillsSchema,
} from "./common/content";

const listCategoriesInputSchema = z
  .object({
    all: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const categoryLookupInputSchema = z.object({
  slug: z.string().min(1),
});

const categoriesListContract = baseContract
  .route({
    description:
      "Returns the public category index used by browse pages and SEO discovery surfaces.",
    method: "GET",
    path: "/categories",
    tags: ["Categories", "Internal"],
    successDescription: "Public category list",
    summary: "List public categories",
  })
  .input(listCategoriesInputSchema)
  .output(z.array(categoryListItemSchema));

const categoriesCountContract = baseContract
  .route({
    description: "Returns the total number of public categories currently available.",
    method: "GET",
    path: "/categories/count",
    tags: ["Categories", "Internal"],
    successDescription: "Public category count",
    summary: "Count public categories",
  })
  .output(z.number().int().nonnegative());

const categoryBySlugContract = baseContract
  .route({
    description: "Returns the public category detail payload, including related tags.",
    method: "GET",
    path: "/categories/by-slug",
    tags: ["Categories", "Internal"],
    successDescription: "Category detail page payload",
    summary: "Read a category by slug",
  })
  .input(categoryLookupInputSchema)
  .output(categoryDetailSchema.nullable());

const categoryTopSkillsBySlugContract = baseContract
  .route({
    description: "Returns the top skills for a public category detail page.",
    method: "GET",
    path: "/categories/by-slug/top-skills",
    tags: ["Categories", "Internal"],
    successDescription: "Category top skills payload",
    summary: "Read category top skills by slug",
  })
  .input(categoryLookupInputSchema)
  .output(categoryTopSkillsSchema.nullable());

const listCategoriesForAiContract = baseContract
  .route({
    description: "Returns the category slug list used by AI-assisted categorization prompts.",
    method: "GET",
    path: "/categories/ai",
    tags: ["Categories", "Internal"],
    successDescription: "AI category list",
    summary: "List categories for AI",
  })
  .output(z.array(z.string()));

export const categoriesContract = {
  count: categoriesCountContract,
  getBySlug: categoryBySlugContract,
  getTopSkillsBySlug: categoryTopSkillsBySlugContract,
  list: categoriesListContract,
  listForAi: listCategoriesForAiContract,
} as const;
