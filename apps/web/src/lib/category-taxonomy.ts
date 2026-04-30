import {
  categories_analysis_insights_description,
  categories_analysis_insights_name,
  categories_code_frameworks_description,
  categories_code_frameworks_name,
  categories_communication_strategy_description,
  categories_communication_strategy_name,
  categories_design_creative_description,
  categories_design_creative_name,
  categories_domain_expertise_description,
  categories_domain_expertise_name,
  categories_operations_automation_description,
  categories_operations_automation_name,
  categories_other_description,
  categories_other_name,
  categories_process_methodology_description,
  categories_process_methodology_name,
  categories_tools_platforms_description,
  categories_tools_platforms_name,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";
import {
  CATEGORY_DEFINITION_BY_SLUG,
  CATEGORY_DEFINITIONS,
  CATEGORY_SLUGS,
} from "@skills-re/contract/categories-taxonomy";
import type { CategorySlug } from "@skills-re/contract/categories-taxonomy";

type CategoryMessage = typeof categories_code_frameworks_name;

const CATEGORY_MESSAGES: Record<
  CategorySlug,
  {
    description: CategoryMessage;
    title: CategoryMessage;
  }
> = {
  "analysis-insights": {
    description: categories_analysis_insights_description,
    title: categories_analysis_insights_name,
  },
  "code-frameworks": {
    description: categories_code_frameworks_description,
    title: categories_code_frameworks_name,
  },
  "communication-strategy": {
    description: categories_communication_strategy_description,
    title: categories_communication_strategy_name,
  },
  "design-creative": {
    description: categories_design_creative_description,
    title: categories_design_creative_name,
  },
  "domain-expertise": {
    description: categories_domain_expertise_description,
    title: categories_domain_expertise_name,
  },
  "operations-automation": {
    description: categories_operations_automation_description,
    title: categories_operations_automation_name,
  },
  other: {
    description: categories_other_description,
    title: categories_other_name,
  },
  "process-methodology": {
    description: categories_process_methodology_description,
    title: categories_process_methodology_name,
  },
  "tools-platforms": {
    description: categories_tools_platforms_description,
    title: categories_tools_platforms_name,
  },
};

const resolveLocale = (locale?: Locale) => locale ?? getLocale();

const getCategoryMessage = (slug: CategorySlug, locale?: Locale) => {
  const messages = CATEGORY_MESSAGES[slug];

  return {
    description: messages.description({}, { locale: resolveLocale(locale) }),
    title: messages.title({}, { locale: resolveLocale(locale) }),
  };
};

export const getCategoryDefinition = (slug: string) =>
  CATEGORY_DEFINITION_BY_SLUG[slug as CategorySlug] ?? CATEGORY_DEFINITION_BY_SLUG.other;

export const getCategoryCopy = (locale: Locale, slug: string) => {
  const definition = getCategoryDefinition(slug);

  return getCategoryMessage(definition.slug, locale);
};

export const getCategoryTitle = (slug: string, locale?: Locale) =>
  getCategoryCopy(resolveLocale(locale), slug).title;

export const getCategoryDescription = (slug: string, locale?: Locale) =>
  getCategoryCopy(resolveLocale(locale), slug).description;

export const getCategoryLabel = (slug: string, locale?: Locale) => getCategoryTitle(slug, locale);

export const getCategoryPresentation = (slug: string, index?: number, locale?: Locale) => {
  const definition = getCategoryDefinition(slug);
  const copy = getCategoryCopy(resolveLocale(locale), slug);
  const position = index ?? definition.position;

  return {
    ...copy,
    num: String(position + 1).padStart(2, "0"),
    variant: definition.variant,
  };
};

export { CATEGORY_DEFINITIONS, CATEGORY_DEFINITION_BY_SLUG, CATEGORY_SLUGS, type CategorySlug };
