import { z } from "zod";

export const CATEGORY_DEFINITIONS = [
  {
    descriptionKey: "categories_code_frameworks_description",
    keywords: ["framework", "sdk", "library", "boilerplate", "scaffold"],
    name: "Code Frameworks",
    nameKey: "categories_code_frameworks_name",
    parentSlug: null,
    position: 1,
    slug: "code-frameworks",
    variant: "default",
  },
  {
    descriptionKey: "categories_tools_platforms_description",
    keywords: ["tooling", "platform", "cli", "infra", "workspace"],
    name: "Tools & Platforms",
    nameKey: "categories_tools_platforms_name",
    parentSlug: null,
    position: 2,
    slug: "tools-platforms",
    variant: "green",
  },
  {
    descriptionKey: "categories_analysis_insights_description",
    keywords: ["analysis", "research", "insight", "metrics", "synthesis"],
    name: "Analysis & Insights",
    nameKey: "categories_analysis_insights_name",
    parentSlug: null,
    position: 3,
    slug: "analysis-insights",
    variant: "accent",
  },
  {
    descriptionKey: "categories_design_creative_description",
    keywords: ["design", "creative", "visual", "branding", "illustration"],
    name: "Design & Creative",
    nameKey: "categories_design_creative_name",
    parentSlug: null,
    position: 4,
    slug: "design-creative",
    variant: "blue",
  },
  {
    descriptionKey: "categories_process_methodology_description",
    keywords: ["process", "methodology", "workflow", "checklist", "protocol"],
    name: "Process & Methodology",
    nameKey: "categories_process_methodology_name",
    parentSlug: null,
    position: 5,
    slug: "process-methodology",
    variant: "italic",
  },
  {
    descriptionKey: "categories_communication_strategy_description",
    keywords: ["communication", "strategy", "writing", "stakeholder", "brief"],
    name: "Communication & Strategy",
    nameKey: "categories_communication_strategy_name",
    parentSlug: null,
    position: 6,
    slug: "communication-strategy",
    variant: "blue",
  },
  {
    descriptionKey: "categories_domain_expertise_description",
    keywords: ["domain", "expertise", "specialist", "industry", "vertical"],
    name: "Domain Expertise",
    nameKey: "categories_domain_expertise_name",
    parentSlug: null,
    position: 7,
    slug: "domain-expertise",
    variant: "accent",
  },
  {
    descriptionKey: "categories_operations_automation_description",
    keywords: ["automation", "ops", "orchestration", "cron", "pipeline"],
    name: "Operations & Automation",
    nameKey: "categories_operations_automation_name",
    parentSlug: null,
    position: 8,
    slug: "operations-automation",
    variant: "green",
  },
  {
    descriptionKey: "categories_other_description",
    keywords: ["other", "generic", "misc", "unclear", "ambiguous"],
    name: "Other",
    nameKey: "categories_other_name",
    parentSlug: null,
    position: 9,
    slug: "other",
    variant: "default",
  },
] as const;

export type CategoryDefinition = (typeof CATEGORY_DEFINITIONS)[number];
export type CategorySlug = CategoryDefinition["slug"];

export const CATEGORY_SLUGS = CATEGORY_DEFINITIONS.map((definition) => definition.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

export const categorySlugSchema = z.enum(CATEGORY_SLUGS);

export const CATEGORY_DEFINITION_BY_SLUG = Object.fromEntries(
  CATEGORY_DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<CategorySlug, CategoryDefinition>;
