import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Static legal/policy pages (terms, privacy, cookies).
 *
 * File layout:  src/content/pages/{locale}/{slug}.md
 * Entry IDs:    "{locale}/{slug}"  e.g. "en/terms", "de/privacy"
 *
 * Locale is derived from the path — no extra frontmatter field required.
 * Missing translations fall back to "en" at query time via getPage().
 */
const pagesCollection = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updatedAt: z.coerce.date(),
  }),
});

/**
 * Documentation pages.
 *
 * File layout:  src/content/docs/{locale}/{slug}.md
 * Entry IDs:    "{locale}/{slug}"  e.g. "en/getting-started"
 */
const docsCollection = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    order: z.number().default(99),
    updatedAt: z.coerce.date().optional(),
  }),
});

/**
 * FAQ entries — one file per question per locale.
 *
 * File layout:  src/content/faqs/{locale}/{id}.md
 * Entry IDs:    "{locale}/{id}"  e.g. "en/01-what-is"
 */
const faqsCollection = defineCollection({
  loader: glob({ base: "./src/content/faqs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    question: z.string(),
    order: z.number(),
  }),
});

/**
 * Platform changelog entries.
 *
 * File layout:  src/content/changelogs/{locale}/{version}.md
 * Entry IDs:    "{locale}/{version}"  e.g. "en/2.4.1"
 */
const changelogCollection = defineCollection({
  loader: glob({ base: "./src/content/changelogs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    version: z.string().regex(/^(\d+\.)?(\d+\.)?(\*|\d+)$/),
    date: z.coerce.date(),
  }),
});

export const collections = {
  pages: pagesCollection,
  docs: docsCollection,
  faqs: faqsCollection,
  // changelogs: changelogCollection,
};
