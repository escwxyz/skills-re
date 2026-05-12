export const buildAuthorOgImagePath = (handle: string) =>
  `/api/og/authors/${encodeURIComponent(handle)}/png`;

export const buildSkillOgImagePath = (input: {
  authorHandle: string;
  repoName?: string | null;
  skillSlug: string;
}) => {
  if (!input.repoName) {
    return null;
  }

  return `/api/og/skills/${encodeURIComponent(input.authorHandle)}/${encodeURIComponent(
    input.repoName,
  )}/${encodeURIComponent(input.skillSlug)}/png`;
};

export const buildCategoryOgImagePath = (slug: string) =>
  `/api/og/categories/${encodeURIComponent(slug)}/png`;

export const buildCollectionOgImagePath = (slug: string) =>
  `/api/og/collections/${encodeURIComponent(slug)}/png`;

export const buildTagOgImagePath = (slug: string) => `/api/og/tags/${encodeURIComponent(slug)}/png`;

export const OG_SKILLS_IMAGE_PATH = "/api/og/skills/png";
export const OG_AUTHORS_IMAGE_PATH = "/api/og/authors/png";
export const OG_CATEGORIES_IMAGE_PATH = "/api/og/categories/png";
export const OG_COLLECTIONS_IMAGE_PATH = "/api/og/collections/png";
export const OG_TAGS_IMAGE_PATH = "/api/og/tags/png";
