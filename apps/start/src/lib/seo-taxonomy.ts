import { SITE_NAME } from "@/lib/constants";
import { kebabToTitle } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";

export const formatPublicSkillCount = (count: number, locale?: Locale) =>
  count.toLocaleString(locale);

export const buildTagsHubSeo = (input: { count: number; locale?: Locale; siteName?: string }) => {
  const siteName = input.siteName ?? SITE_NAME;

  return {
    description: m.ui_tags_hub_description(
      {
        count: formatPublicSkillCount(input.count, input.locale),
        siteName,
      },
      input.locale ? { locale: input.locale } : undefined,
    ),
    title: m.ui_tags_hub_title({ siteName }, input.locale ? { locale: input.locale } : undefined),
  };
};

export const buildTagSeo = (input: {
  count: number;
  locale?: Locale;
  siteName?: string;
  slug: string;
}) => {
  const siteName = input.siteName ?? SITE_NAME;
  const tagName = kebabToTitle(input.slug);

  return {
    description: m.ui_tag_seo_description(
      {
        countLabel: formatPublicSkillCount(input.count, input.locale),
        siteName,
        tagName,
      },
      input.locale ? { locale: input.locale } : undefined,
    ),
    heading: m.ui_tag_seo_heading({ tagName }, input.locale ? { locale: input.locale } : undefined),
    name: tagName,
    title: m.ui_tag_seo_title(
      { siteName, tagName },
      input.locale ? { locale: input.locale } : undefined,
    ),
  };
};
