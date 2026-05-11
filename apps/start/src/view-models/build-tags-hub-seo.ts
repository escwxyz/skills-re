import { SITE_NAME } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";

export const buildTagsHubSeo = (input: { count: number; locale?: Locale; siteName?: string }) => {
  const siteName = input.siteName ?? SITE_NAME;

  return {
    description: m.ui_tags_hub_description(
      {
        count: input.count.toLocaleString(input.locale),
        siteName,
      },
      input.locale ? { locale: input.locale } : undefined,
    ),
    title: m.ui_tags_hub_title({ siteName }, input.locale ? { locale: input.locale } : undefined),
  };
};
