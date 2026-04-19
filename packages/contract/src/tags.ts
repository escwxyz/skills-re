import { z } from "zod";

import { baseContract } from "./common/base";
import { tagDetailSchema, tagListItemSchema } from "./common/content";
import { tagSlugSchema } from "./common/slugs";

const listTagsInputSchema = z
  .object({
    all: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const listIndexableTagsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(5000).optional(),
    minCount: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const tagLookupInputSchema = z.object({
  slug: tagSlugSchema,
});

const tagsListContract = baseContract
  .route({
    description: "Returns the public tag index used by browse pages and SEO discovery surfaces.",
    method: "GET",
    path: "/tags",
    tags: ["Tags"],
    successDescription: "Public tag list",
    summary: "List public tags",
  })
  .input(listTagsInputSchema)
  .output(z.array(tagListItemSchema));

const tagsCountContract = baseContract
  .route({
    description: "Returns the total number of public tags currently available.",
    method: "GET",
    path: "/tags/count",
    tags: ["Tags"],
    successDescription: "Public tag count",
    summary: "Count public tags",
  })
  .output(z.number().int().nonnegative());

const tagBySlugContract = baseContract
  .route({
    description:
      "Returns the SEO-oriented public tag detail payload, including related categories and top skills.",
    method: "GET",
    path: "/tags/by-slug",
    tags: ["Tags"],
    successDescription: "Tag detail page payload",
    summary: "Read a tag by slug",
  })
  .input(tagLookupInputSchema)
  .output(tagDetailSchema.nullable());

const listTagsForSeoContract = baseContract
  .route({
    description: "Returns the tag index optimized for SEO sitemap and discovery generation.",
    method: "GET",
    path: "/tags/seo",
    tags: ["Tags"],
    successDescription: "SEO tag list",
    summary: "List tags for SEO",
  })
  .output(z.array(tagListItemSchema));

const listIndexableTagsContract = baseContract
  .route({
    description: "Returns the indexable tag set used by crawlable browsing and discovery pages.",
    method: "GET",
    path: "/tags/indexable",
    tags: ["Tags"],
    successDescription: "Indexable tag list",
    summary: "List indexable tags",
  })
  .input(listIndexableTagsInputSchema)
  .output(z.array(tagListItemSchema));

export const tagsContract = {
  count: tagsCountContract,
  getBySlug: tagBySlugContract,
  list: tagsListContract,
  listForSeo: listTagsForSeoContract,
  listIndexable: listIndexableTagsContract,
} as const;
