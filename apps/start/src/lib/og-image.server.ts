// i18n
import { createServerORPCClient } from "@/lib/orpc.server";
import { buildTagSeo, buildTagsHubSeo } from "@/lib/seo-taxonomy";
import { createOgImageResponse } from "@/lib/og-image";
import { fetchCategoryDetailPageData } from "@/functions/categories/categories.server";
import { fetchCollectionDetailPageData } from "@/functions/collections/collections.server";
import { fetchTagDetailPageData } from "@/functions/tags/tags.server";
import { getCategoryDescription, getCategoryLabel } from "@/utils/category-data";

export const createAuthorOgImageResponse = async ({
  handle,
  requestUrl,
  twitter,
}: {
  handle: string;
  requestUrl: string;
  twitter?: boolean;
}) => {
  const client = createServerORPCClient();
  const author = await client.skills.getAuthorByHandle({ handle });

  if (!author) {
    return new Response("Author not found.", { status: 404 });
  }

  const displayName = author.name ?? author.handle;
  return createOgImageResponse({
    accentColor: "#1d3a8a",
    description: `${displayName} publishes ${author.skillCount ?? 0} public skills across ${
      author.repoCount ?? 0
    } repositories.`,
    eyebrow: "Publisher profile",
    highlight: `github.com/${author.handle}`,
    identityHandle: `@${author.handle}`,
    metrics: [
      { label: "Skills", value: author.skillCount ?? 0 },
      { label: "Repos", value: author.repoCount ?? 0 },
    ],
    requestUrl,
    title: displayName,
    twitter,
  });
};

export const createSkillOgImageResponse = async ({
  author,
  repo,
  requestUrl,
  skillSlug,
  twitter,
}: {
  author: string;
  repo: string;
  requestUrl: string;
  skillSlug: string;
  twitter?: boolean;
}) => {
  const client = createServerORPCClient();
  const skill = await client.skills.getByPath({
    authorHandle: author,
    repoName: repo,
    skillSlug,
  });

  if (!skill) {
    return new Response("Skill not found.", { status: 404 });
  }

  return createOgImageResponse({
    accentColor: "#2d5a3d",
    description: skill.description,
    eyebrow: "Skill preview",
    highlight: `${skill.authorHandle ?? author}/${skill.repoName ?? repo}`,
    identityHandle: `@${skill.authorHandle ?? author}`,
    metrics: [
      { label: "Stars", value: skill.stargazerCount ?? 0 },
      { label: "Forks", value: skill.forkCount ?? 0 },
      { label: "Downloads", value: skill.downloadsAllTime ?? 0 },
    ],
    requestUrl,
    title: skill.title,
    twitter,
  });
};

export const createCategoryOgImageResponse = async ({
  slug,
  requestUrl,
  twitter,
}: {
  slug: string;
  requestUrl: string;
  twitter?: boolean;
}) => {
  const data = await fetchCategoryDetailPageData(slug);
  if (!data) {
    return new Response("Category not found.", { status: 404 });
  }

  const title = getCategoryLabel(slug);
  const description = getCategoryDescription(slug);

  return createOgImageResponse({
    accentColor: "#2d5a3d",
    description,
    eyebrow: "Category",
    highlight: `skills.re/categories/${slug}`,
    identityHandle: `#${slug}`,
    metrics: [
      { label: "Skills", value: data.categoryDetail.count },
      { label: "Tags", value: data.categoryDetail.relatedTags.length },
    ],
    requestUrl,
    title,
    twitter,
  });
};

export const createCollectionOgImageResponse = async ({
  slug,
  requestUrl,
  twitter,
}: {
  slug: string;
  requestUrl: string;
  twitter?: boolean;
}) => {
  const data = await fetchCollectionDetailPageData(slug, "en");
  if (!data) {
    return new Response("Collection not found.", { status: 404 });
  }

  return createOgImageResponse({
    accentColor: "#dc2626",
    description: data.description ?? "",
    eyebrow: "Collection",
    highlight: `@skills.re/${slug}`,
    identityHandle: `@skills.re/${slug}`,
    metrics: [
      { label: "Skills", value: data.skills.length },
      { label: "Downloads", value: data.totalDownloads },
    ],
    requestUrl,
    title: data.title,
    twitter,
  });
};

export const createTagOgImageResponse = async ({
  slug,
  requestUrl,
  twitter,
}: {
  slug: string;
  requestUrl: string;
  twitter?: boolean;
}) => {
  const data = await fetchTagDetailPageData(slug);
  if (!data) {
    return new Response("Tag not found.", { status: 404 });
  }

  const seo = buildTagSeo({ count: data.count, slug });

  return createOgImageResponse({
    accentColor: "#7c3aed",
    description: seo.description,
    eyebrow: "Skill tag",
    highlight: `skills.re/tags/${slug}`,
    identityHandle: `#${slug}`,
    metrics: [{ label: "Skills", value: data.count }],
    requestUrl,
    title: seo.name,
    twitter,
  });
};

// ── Aggregation / index pages ───────────────────────────────────────────────

interface IndexOgInput {
  requestUrl: string;
  twitter?: boolean;
}

export const createSkillsIndexOgImageResponse = async ({ requestUrl, twitter }: IndexOgInput) => {
  const client = createServerORPCClient();
  const [skillsCount, categories] = await Promise.all([
    client.skills.count(),
    client.categories.list({ all: true, limit: 100 }),
  ]);

  return createOgImageResponse({
    accentColor: "#c2410c",
    description: "Find, evaluate, and install skills for your AI agent.",
    eyebrow: "Discover",
    highlight: "skills.re/skills",
    identityHandle: "#browse",
    metrics: [
      { label: "Skills", value: skillsCount },
      { label: "Categories", value: categories.length },
    ],
    requestUrl,
    title: "Browse Skills",
    twitter,
  });
};

export const createAuthorsIndexOgImageResponse = async ({ requestUrl, twitter }: IndexOgInput) => {
  const client = createServerORPCClient();
  const [authors, skillsCount] = await Promise.all([
    client.skills.listAuthors(),
    client.skills.count(),
  ]);

  return createOgImageResponse({
    accentColor: "#1d3a8a",
    description: "Authors and teams publishing verified skills for Claude and compatible runtimes.",
    eyebrow: "Directory",
    highlight: "skills.re/authors",
    identityHandle: "#authors",
    metrics: [
      { label: "Publishers", value: authors.length },
      { label: "Skills", value: skillsCount },
    ],
    requestUrl,
    title: "Publishers",
    twitter,
  });
};

export const createCategoriesIndexOgImageResponse = async ({
  requestUrl,
  twitter,
}: IndexOgInput) => {
  const client = createServerORPCClient();
  const [categories, skillsCount] = await Promise.all([
    client.categories.list({ all: true, limit: 100 }),
    client.skills.count(),
  ]);

  return createOgImageResponse({
    accentColor: "#2d5a3d",
    description: "Discover skills organized by domain, use case, and capability.",
    eyebrow: "Browse",
    highlight: "skills.re/categories",
    identityHandle: "#categories",
    metrics: [
      { label: "Categories", value: categories.length },
      { label: "Skills", value: skillsCount },
    ],
    requestUrl,
    title: "Categories",
    twitter,
  });
};

export const createCollectionsIndexOgImageResponse = async ({
  requestUrl,
  twitter,
}: IndexOgInput) => {
  const client = createServerORPCClient();
  const { page: collections } = await client.collections.list({ limit: 100 });

  return createOgImageResponse({
    accentColor: "#dc2626",
    description: "Curated sets of skills that work well together, tested and argued over.",
    eyebrow: "Curated",
    highlight: "skills.re/collections",
    identityHandle: "#collections",
    metrics: [{ label: "Collections", value: collections.length }],
    requestUrl,
    title: "Collections",
    twitter,
  });
};

export const createTagsIndexOgImageResponse = async ({ requestUrl, twitter }: IndexOgInput) => {
  const client = createServerORPCClient();
  const { totalCount } = await client.tags.listPage({ limit: 1 });
  const count = totalCount ?? 0;
  const seo = buildTagsHubSeo({ count });

  return createOgImageResponse({
    accentColor: "#7c3aed",
    description: seo.description,
    eyebrow: "Browse",
    highlight: "skills.re/tags",
    identityHandle: "#tags",
    metrics: [{ label: "Tags", value: count }],
    requestUrl,
    title: "Skill Tags",
    twitter,
  });
};
