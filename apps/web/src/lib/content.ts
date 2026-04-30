// oxlint-disable no-nested-ternary
import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { baseLocale as defaultLocale, getLocaleForUrl, locales } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";

export type PageSlug = "terms" | "privacy" | "cookies" | "imprint";

export type DocSlug =
  | "getting-started"
  | "publishing-skills"
  | "github-integration"
  | "api-reference"
  | "best-practices"
  | "troubleshooting";

const resolveLocale = (pathOrLocale?: string): Locale =>
  locales.includes(pathOrLocale as Locale)
    ? (pathOrLocale as Locale)
    : pathOrLocale
      ? getLocaleForUrl(pathOrLocale)
      : defaultLocale;

const getLocalizedCollection = async <T extends "docs" | "faqs" | "changelogs">(
  collection: T,
  locale: Locale,
  filter?: (entry: CollectionEntry<T>) => boolean,
) => {
  const entries = await getCollection(
    collection,
    (entry) => entry.id.startsWith(`${locale}/`) && (filter ? filter(entry) : true),
  );

  if (entries.length > 0 || locale === defaultLocale) {
    return entries;
  }

  return getCollection(
    collection,
    (entry) => entry.id.startsWith(`${defaultLocale}/`) && (filter ? filter(entry) : true),
  );
};

/**
 * Fetches a static page entry for the given locale, falling back to the
 * default locale ("en") if a translation hasn't been authored yet.
 */
export async function getPage(slug: PageSlug, pathOrLocale?: string) {
  const locale = resolveLocale(pathOrLocale);
  return (
    (await getEntry("pages", `${locale}/${slug}`)) ??
    (await getEntry("pages", `${defaultLocale}/${slug}`))
  );
}

/**
 * Fetches all doc entries for the given locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getDocs(pathOrLocale?: string) {
  const locale = resolveLocale(pathOrLocale);
  const entries = await getLocalizedCollection("docs", locale);
  return entries.toSorted((a, b) => a.data.order - b.data.order);
}

/**
 * Fetches a single doc entry for the given locale, falling back to "en".
 */
export async function getDoc(slug: string, pathOrLocale?: string) {
  const locale = resolveLocale(pathOrLocale);
  return (
    (await getEntry("docs", `${locale}/${slug}`)) ??
    (await getEntry("docs", `${defaultLocale}/${slug}`))
  );
}

/**
 * Fetches all FAQ entries for the given locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getFaqs(pathOrLocale?: string) {
  const locale = resolveLocale(pathOrLocale);
  const entries = await getLocalizedCollection("faqs", locale);
  return entries.toSorted((a, b) => a.data.order - b.data.order);
}

/**
 * Fetches all published changelog entries for the given locale, falling
 * back to "en". Results are sorted by semantic version, newest first.
 */
export async function getChangelogs(pathOrLocale?: string) {
  const locale = resolveLocale(pathOrLocale);
  const entries = await getLocalizedCollection(
    "changelogs",
    locale,
    ({ data }) => data.isPublished,
  );
  return entries.toSorted((a, b) => {
    const d = b.data.versionMajor - a.data.versionMajor;
    if (d !== 0) {
      return d;
    }
    const d2 = b.data.versionMinor - a.data.versionMinor;
    if (d2 !== 0) {
      return d2;
    }
    return b.data.versionPatch - a.data.versionPatch;
  });
}
