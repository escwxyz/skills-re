import type { Thing, WebSite, WithContext } from "schema-dts";

import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
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

const createWebsiteSchema = (): WithContext<WebSite> => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  description: SITE_DESCRIPTION,
  name: SITE_NAME,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
  },
  url: SITE_URL,
});

export function createSeo({
  title,
  description = SITE_DESCRIPTION,
  canonicalPath,
  noIndex = false,
  structuredData = [],
  locale = defaultLocale,
  image,
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
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:url", content: canonicalUrl },
  ];

  if (resolvedImage) {
    meta.push(
      { property: "og:image", content: resolvedImage },
      { property: "og:image:alt", content: resolvedTitle },
      { name: "twitter:image", content: resolvedImage },
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
    { rel: "api-catalog", href: "/.well-known/api-catalog" },
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

  const scripts: SeoScriptDescriptor[] = [
    {
      type: "application/ld+json",
      children: JSON.stringify(createWebsiteSchema()),
    },
    ...structuredData.map((item) => ({
      type: "application/ld+json" as const,
      children: JSON.stringify(item),
    })),
  ];

  return {
    links,
    meta,
    scripts,
  };
}
