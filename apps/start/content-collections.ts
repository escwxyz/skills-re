import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMarkdown } from "@content-collections/markdown";
import { z } from "zod/v4";

/**
 * Static legal/policy pages (terms, privacy, cookies).
 *
 * File layout:  contents/pages/{locale}/{slug}.md
 * Entry IDs:    "{locale}/{slug}"  e.g. "en/terms", "de/privacy"
 *
 * Locale is derived from the path — no extra frontmatter field required.
 * Missing translations fall back to "en" at query time via getPage().
 */
const pages = defineCollection({
  name: "pages",
  directory: "./contents/pages",
  include: "**/*.{md,mdx}",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updatedAt: z.coerce.date(),
    content: z.string(),
  }),
  transform: async (document, context) => {
    const html = await compileMarkdown(context, document);
    return { ...document, html };
  },
});

/**
 * Documentation pages.
 *
 * File layout:  contents/docs/{locale}/{slug}.md
 * Entry IDs:    "{locale}/{slug}"  e.g. "en/getting-started"
 */
const docs = defineCollection({
  name: "docs",
  directory: "./contents/docs",
  include: "**/*.{md,mdx}",
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
 * File layout:  contents/faqs/{locale}/{id}.md
 * Entry IDs:    "{locale}/{id}"  e.g. "en/01-what-is"
 */
const faqs = defineCollection({
  name: "faqs",
  directory: "./contents/faqs",
  include: "**/*.{md,mdx}",
  schema: z.object({
    question: z.string(),
    order: z.number(),
  }),
});

/**
 * Platform changelog entries — static content, multi-locale.
 *
 * File layout:  contents/changelogs/{locale}/{versionMajor}.{versionMinor}.{versionPatch}.md
 * Entry IDs:    "{locale}/{version}"  e.g. "en/2.4.1"
 *
 * Version is encoded as three separate integer fields to enable range queries
 * and sorting without parsing strings. The filename should match the version
 * triplet for discoverability but is not validated at build time.
 */
const changelogs = defineCollection({
  name: "changelogs",
  directory: "./contents/changelogs",
  include: "**/*.{md,mdx}",
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

export default defineConfig({
  content: [pages, docs, faqs, changelogs],
});
