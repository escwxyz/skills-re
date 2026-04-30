import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { CATEGORY_DEFINITION_BY_SLUG } from "../../../../packages/contract/src/categories-taxonomy";
import type { CategorySlug } from "../../../../packages/contract/src/categories-taxonomy";

type CategoryLocale = "de" | "en" | "zh-Hans";
type CategoryMessageKey = keyof typeof CATEGORY_MESSAGE_GETTERS;
type CategoryMessageGetter = (locale: CategoryLocale) => string;

const CATEGORY_MESSAGE_GETTERS = {
  categories_analysis_insights_description: (locale) =>
    m.categories_analysis_insights_description({}, { locale }),
  categories_analysis_insights_name: (locale) =>
    m.categories_analysis_insights_name({}, { locale }),
  categories_code_frameworks_description: (locale) =>
    m.categories_code_frameworks_description({}, { locale }),
  categories_code_frameworks_name: (locale) => m.categories_code_frameworks_name({}, { locale }),
  categories_communication_strategy_description: (locale) =>
    m.categories_communication_strategy_description({}, { locale }),
  categories_communication_strategy_name: (locale) =>
    m.categories_communication_strategy_name({}, { locale }),
  categories_design_creative_description: (locale) =>
    m.categories_design_creative_description({}, { locale }),
  categories_design_creative_name: (locale) => m.categories_design_creative_name({}, { locale }),
  categories_domain_expertise_description: (locale) =>
    m.categories_domain_expertise_description({}, { locale }),
  categories_domain_expertise_name: (locale) => m.categories_domain_expertise_name({}, { locale }),
  categories_operations_automation_description: (locale) =>
    m.categories_operations_automation_description({}, { locale }),
  categories_operations_automation_name: (locale) =>
    m.categories_operations_automation_name({}, { locale }),
  categories_other_description: (locale) => m.categories_other_description({}, { locale }),
  categories_other_name: (locale) => m.categories_other_name({}, { locale }),
  categories_process_methodology_description: (locale) =>
    m.categories_process_methodology_description({}, { locale }),
  categories_process_methodology_name: (locale) =>
    m.categories_process_methodology_name({}, { locale }),
  categories_tools_platforms_description: (locale) =>
    m.categories_tools_platforms_description({}, { locale }),
  categories_tools_platforms_name: (locale) => m.categories_tools_platforms_name({}, { locale }),
} as const satisfies Record<string, CategoryMessageGetter>;

const normalizeLocale = (locale: string | undefined): CategoryLocale =>
  locale === "de" || locale === "zh-Hans" ? locale : "en";

const getCategoryDefinition = (slug: string) =>
  CATEGORY_DEFINITION_BY_SLUG[slug as CategorySlug] ?? CATEGORY_DEFINITION_BY_SLUG.other;

const getCategoryMessage = (locale: CategoryLocale, key: string) => {
  const message = CATEGORY_MESSAGE_GETTERS[key as CategoryMessageKey];
  return message ? message(locale) : "";
};

export const getCategoryCopy = (locale: CategoryLocale, slug: string) => {
  const definition = getCategoryDefinition(slug);

  return {
    description: getCategoryMessage(locale, definition.descriptionKey),
    title: getCategoryMessage(locale, definition.nameKey),
  };
};

export const getCategoryPresentation = (slug: string, index: number) => {
  const definition = getCategoryDefinition(slug);

  return {
    num: String(definition.position ?? index + 1).padStart(2, "0"),
    variant: definition.variant ?? "default",
  } as const;
};

export const getCategoryTitle = (slug: string) =>
  getCategoryCopy(normalizeLocale(getLocale()), slug).title;

export const getCategoryDescription = (slug: string) =>
  getCategoryCopy(normalizeLocale(getLocale()), slug).description;

export const getCategoryLabel = (slug: string) => getCategoryTitle(slug);

export { CATEGORY_DEFINITIONS, CATEGORY_DEFINITION_BY_SLUG, CATEGORY_SLUGS, type CategorySlug };
