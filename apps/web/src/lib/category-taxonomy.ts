import {
  CATEGORY_DEFINITION_BY_SLUG,
  CATEGORY_DEFINITIONS,
  CATEGORY_SLUGS,
} from "@skills-re/contract/categories-taxonomy";
import type { CategorySlug } from "@skills-re/contract/categories-taxonomy";

const CATEGORY_DESCRIPTIONS: Record<CategorySlug, string> = {
  "analysis-insights":
    "Research, analysis, and synthesis work that turns information into insight.",
  "code-frameworks":
    "Reusable libraries, SDKs, boilerplates, and scaffolds for building software faster.",
  "communication-strategy":
    "Writing, messaging, stakeholder alignment, and planning work that shapes how ideas land.",
  "design-creative":
    "Visual, branding, illustration, and other creative work focused on presentation.",
  "domain-expertise":
    "Specialized knowledge and experience in a particular industry, field, or vertical.",
  "operations-automation":
    "Automation, orchestration, and recurring operational workflows that keep things running.",
  other: "Fallback classification for ambiguous, weak, or uncategorized items.",
  "process-methodology":
    "Process, workflow, checklist, and protocol work that defines how tasks should be done.",
  "tools-platforms":
    "Tooling, platforms, CLI utilities, infrastructure, and workspace support systems.",
};

const getCategoryDefinition = (slug: string) =>
  CATEGORY_DEFINITION_BY_SLUG[slug as CategorySlug] ?? CATEGORY_DEFINITION_BY_SLUG.other;

export const getCategoryCopy = (_locale: string, slug: string) => {
  const definition = getCategoryDefinition(slug);

  return {
    description: CATEGORY_DESCRIPTIONS[definition.slug],
    title: definition.name,
  };
};

export const getCategoryPresentation = (slug: string, index: number) => {
  const definition = getCategoryDefinition(slug);

  return {
    num: String(definition.position ?? index + 1).padStart(2, "0"),
    variant: definition.variant ?? "default",
  } as const;
};

export const getCategoryTitle = (slug: string) => getCategoryCopy("en", slug).title;

export const getCategoryDescription = (slug: string) => getCategoryCopy("en", slug).description;

export const getCategoryLabel = (slug: string) => getCategoryTitle(slug);

export { CATEGORY_DEFINITIONS, CATEGORY_DEFINITION_BY_SLUG, CATEGORY_SLUGS, type CategorySlug };
