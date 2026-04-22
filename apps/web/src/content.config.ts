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
 * Platform changelog entries — static content, multi-locale.
 *
 * File layout:  src/content/changelogs/{locale}/{versionMajor}.{versionMinor}.{versionPatch}.md
 * Entry IDs:    "{locale}/{version}"  e.g. "en/2.4.1"
 *
 * Version is encoded as three separate integer fields to enable range queries
 * and sorting without parsing strings. The filename should match the version
 * triplet for discoverability but is not validated at build time.
 */
const changelogCollection = defineCollection({
  loader: glob({ base: "./src/content/changelogs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(["feature", "patch", "major"]),
    versionMajor: z.number().int().nonnegative(),
    versionMinor: z.number().int().nonnegative(),
    versionPatch: z.number().int().nonnegative(),
    isPublished: z.boolean(),
    isStable: z.boolean(),
    date: z.coerce.date(),
    changes: z.array(z.string()),
  }),
});

export const collections = {
  pages: pagesCollection,
  docs: docsCollection,
  faqs: faqsCollection,
  changelogs: changelogCollection,
};
