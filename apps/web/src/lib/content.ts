import { getCollection, getEntry } from "astro:content";
import { getLocale, baseLocale } from "@/paraglide/runtime";

export type PageSlug = "terms" | "privacy" | "cookies" | "imprint";

export type DocSlug =
  | "getting-started"
  | "publishing-skills"
  | "github-integration"
  | "api-reference"
  | "best-practices"
  | "troubleshooting";

/**
 * Fetches a static page entry for the current locale, falling back to the
 * base locale ("en") if a translation hasn't been authored yet.
 */
export async function getPage(slug: PageSlug) {
  const locale = getLocale();
  return (
    (await getEntry("pages", `${locale}/${slug}`)) ??
    (await getEntry("pages", `${baseLocale}/${slug}`))
  );
}

/**
 * Fetches all doc entries for the current locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getDocs() {
  const locale = getLocale();
  const all = await getCollection("docs");
  const locale_docs = all.filter((e) => e.id.startsWith(`${locale}/`));
  const entries = locale_docs.length > 0
    ? locale_docs
    : all.filter((e) => e.id.startsWith(`${baseLocale}/`));
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Fetches a single doc entry for the current locale, falling back to "en".
 */
export async function getDoc(slug: string) {
  const locale = getLocale();
  return (
    (await getEntry("docs", `${locale}/${slug}`)) ??
    (await getEntry("docs", `${baseLocale}/${slug}`))
  );
}

/**
 * Fetches all FAQ entries for the current locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getFaqs() {
  const locale = getLocale();
  const all = await getCollection("faqs");
  const locale_faqs = all.filter((e) => e.id.startsWith(`${locale}/`));
  const entries = locale_faqs.length > 0
    ? locale_faqs
    : all.filter((e) => e.id.startsWith(`${baseLocale}/`));
  return entries.sort((a, b) => a.data.order - b.data.order);
}
