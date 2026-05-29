import type {
  BreadcrumbList,
  ListItem,
  Person,
  ProfilePage,
  Thing,
  WebPage,
  WithContext,
} from "schema-dts";

import {
  OG_IMAGE_DEFAULT,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TWITTER_SITE,
  SITE_URL,
} from "@/lib/constants";
import { m } from "@/paraglide/messages";
import {
  baseLocale as defaultLocale,
  deLocalizeHref,
  localizeHref,
  locales as localeMap,
} from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";

export interface SeoOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
  structuredData?: (WithContext<Thing> | Thing)[];
  locale?: Locale;
  image?: string;
  includePageStructuredData?: boolean;
  includeSiteStructuredData?: boolean;
}

interface SeoMetaDescriptor {
  charSet?: string;
  content?: string;
  name?: string;
  property?: string;
  title?: string;
}

interface SeoLinkDescriptor {
  href: string;
  hrefLang?: string;
  rel: string;
  sizes?: string;
  type?: string;
}

interface SeoScriptDescriptor {
  children: string;
  type: "application/ld+json";
}

const resolveUrl = (pathOrUrl: string) => new URL(pathOrUrl, SITE_URL).toString();

const createWebsiteSchema = (): WithContext<Thing> =>
  ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    description: m.home_meta_description(),
    name: SITE_NAME,
    potentialAction: {
      "@type": "SearchAction",
      "query-input": "required name=search_term_string",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/skills?mode=search&q={search_term_string}`,
      },
    },
    url: SITE_URL,
  }) as unknown as WithContext<Thing>;

const createOrganizationSchema = (): WithContext<Thing> => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  logo: resolveUrl("/favicon.svg"),
  name: SITE_NAME,
  url: SITE_URL,
});

const createWebPageSchema = ({
  canonicalUrl,
  description,
  locale,
  title,
}: {
  canonicalUrl: string;
  description: string;
  locale: Locale;
  title: string;
}): WithContext<WebPage> => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  description,
  inLanguage: locale,
  isPartOf: {
    "@id": `${SITE_URL}/#website`,
  },
  name: title,
  url: canonicalUrl,
});

export const createProfilePageSchema = ({
  canonicalUrl,
  description,
  identifier,
  image,
  name,
  sameAs,
  alternateName,
}: {
  alternateName?: string;
  canonicalUrl: string;
  description?: string;
  identifier?: string;
  image?: string;
  name: string;
  sameAs?: string[];
}): WithContext<ProfilePage> => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  ...(description ? { description } : {}),
  ...(image ? { image } : {}),
  mainEntity: {
    "@type": "Person",
    ...(alternateName ? { alternateName } : {}),
    ...(description ? { description } : {}),
    ...(identifier ? { identifier } : {}),
    ...(image ? { image } : {}),
    ...(sameAs?.length ? { sameAs } : {}),
    name,
  } as Person,
  url: canonicalUrl,
});

export const createBreadcrumbListSchema = (
  items: { item?: string; name: string }[],
): WithContext<BreadcrumbList> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(
    (item, index) =>
      ({
        "@type": "ListItem",
        ...(item.item ? { item: item.item } : {}),
        name: item.name,
        position: index + 1,
      }) as ListItem,
  ),
});

export const createSkillBreadcrumbSchema = ({
  authorHandle,
  currentPath,
  skillTitle,
}: {
  authorHandle: string;
  currentPath: string;
  skillTitle: string;
}): WithContext<BreadcrumbList> =>
  createBreadcrumbListSchema([
    {
      item: `${SITE_URL}/skills`,
      name: String(m.skill_breadcrumb_root({})),
    },
    {
      item: `${SITE_URL}/authors/${authorHandle}`,
      name: authorHandle,
    },
    {
      item: `${SITE_URL}${currentPath}`,
      name: skillTitle,
    },
  ]);

export const createSkillDetailSeo = ({
  authorHandle,
  canonicalPath,
  description,
  image,
  locale,
  skillTitle,
  tabLabel,
}: {
  authorHandle: string;
  canonicalPath: string;
  description?: string;
  image?: string;
  locale: Locale;
  skillTitle?: string;
  tabLabel?: string;
}) => {
  let title: string | undefined;
  if (skillTitle) {
    title = tabLabel ? `${tabLabel} · ${skillTitle}` : skillTitle;
  }

  const structuredData = skillTitle
    ? [
        createSkillBreadcrumbSchema({
          authorHandle,
          currentPath: canonicalPath,
          skillTitle,
        }),
      ]
    : [];

  return createSeo({
    canonicalPath,
    description,
    image,
    structuredData,
    title,
    locale,
  });
};

const createStructuredDataScripts = ({
  canonicalUrl,
  description,
  includePageStructuredData,
  includeSiteStructuredData,
  locale,
  structuredData,
  title,
}: {
  canonicalUrl: string;
  description: string;
  includePageStructuredData: boolean;
  includeSiteStructuredData: boolean;
  locale: Locale;
  structuredData: (WithContext<Thing> | Thing)[];
  title: string;
}): SeoScriptDescriptor[] => {
  const scripts: SeoScriptDescriptor[] = [];

  if (includeSiteStructuredData) {
    scripts.push(
      {
        type: "application/ld+json",
        children: JSON.stringify(createWebsiteSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(createOrganizationSchema()),
      },
    );
  }

  if (includePageStructuredData) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(
        createWebPageSchema({
          canonicalUrl,
          description,
          locale,
          title,
        }),
      ),
    });
  }

  scripts.push(
    ...structuredData.map((item) => ({
      type: "application/ld+json" as const,
      children: JSON.stringify(item),
    })),
  );

  return scripts;
};

export function createSeo({
  title,
  description = m.home_meta_description(),
  canonicalPath,
  noIndex = false,
  structuredData = [],
  locale = defaultLocale,
  image = OG_IMAGE_DEFAULT,
  includePageStructuredData = true,
  includeSiteStructuredData = false,
}: SeoOptions = {}) {
  const resolvedTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const resolvedRobots = noIndex ? "noindex, nofollow" : "index, follow";
  const canonicalUrl = canonicalPath ? resolveUrl(canonicalPath) : SITE_URL;
  const pathWithoutLocale = canonicalPath ? deLocalizeHref(canonicalPath) : undefined;
  const resolvedImage = image ? resolveUrl(image) : null;

  const meta: SeoMetaDescriptor[] = [
    { title: resolvedTitle },
    { name: "description", content: description },
    { name: "keywords", content: SITE_KEYWORDS.join(", ") },
    { name: "robots", content: resolvedRobots },
    { name: "googlebot", content: resolvedRobots },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: resolvedTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    { name: "twitter:card", content: resolvedImage ? "summary_large_image" : "summary" },
    { name: "twitter:site", content: SITE_TWITTER_SITE },
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:url", content: canonicalUrl },
  ];

  if (resolvedImage) {
    const resolvedTwitterImage = image ? resolveUrl(`${image}?twitter=1`) : resolvedImage;
    meta.push(
      { property: "og:image", content: resolvedImage },
      { property: "og:image:alt", content: resolvedTitle },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: resolvedTwitterImage },
      { name: "twitter:image:alt", content: resolvedTitle },
      { name: "twitter:image:width", content: "1200" },
      { name: "twitter:image:height", content: "675" },
    );
  }

  const links: SeoLinkDescriptor[] = [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
    { rel: "shortcut icon", href: "/favicon.ico" },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    },
    { rel: "manifest", href: "/site.webmanifest" },
  ];

  if (pathWithoutLocale) {
    links.push({ rel: "canonical", href: resolveUrl(localizeHref(pathWithoutLocale, { locale })) });

    for (const mapLocale of localeMap) {
      links.push({
        rel: "alternate",
        hrefLang: mapLocale,
        href: resolveUrl(localizeHref(pathWithoutLocale, { locale: mapLocale })),
      });
    }

    links.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: resolveUrl(localizeHref(pathWithoutLocale, { locale: defaultLocale })),
    });
  }

  return {
    links,
    meta,
    scripts: createStructuredDataScripts({
      canonicalUrl,
      description,
      includePageStructuredData,
      includeSiteStructuredData,
      locale,
      structuredData,
      title: resolvedTitle,
    }),
  };
}
