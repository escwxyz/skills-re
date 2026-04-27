import { getCollection, getEntry } from "astro:content"
import { getLocaleFromPath, defaultLocale } from "intlayer"

export type PageSlug = "terms" | "privacy" | "cookies" | "imprint"

export type DocSlug =
  | "getting-started"
  | "publishing-skills"
  | "github-integration"
  | "api-reference"
  | "best-practices"
  | "troubleshooting"

/**
 * Fetches a static page entry for the given locale, falling back to the
 * default locale ("en") if a translation hasn't been authored yet.
 */
export async function getPage(slug: PageSlug, pathOrLocale?: string) {
  const locale = pathOrLocale
    ? (getLocaleFromPath(pathOrLocale) ?? defaultLocale)
    : defaultLocale
  return (
    (await getEntry("pages", `${locale}/${slug}`)) ??
    (await getEntry("pages", `${defaultLocale}/${slug}`))
  )
}

/**
 * Fetches all doc entries for the given locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getDocs(pathOrLocale?: string) {
  const locale = pathOrLocale
    ? (getLocaleFromPath(pathOrLocale) ?? defaultLocale)
    : defaultLocale
  const all = await getCollection("docs")
  const locale_docs = all.filter((e) => e.id.startsWith(`${locale}/`))
  const entries =
    locale_docs.length > 0
      ? locale_docs
      : all.filter((e) => e.id.startsWith(`${defaultLocale}/`))
  return entries.toSorted((a, b) => a.data.order - b.data.order)
}

/**
 * Fetches a single doc entry for the given locale, falling back to "en".
 */
export async function getDoc(slug: string, pathOrLocale?: string) {
  const locale = pathOrLocale
    ? (getLocaleFromPath(pathOrLocale) ?? defaultLocale)
    : defaultLocale
  return (
    (await getEntry("docs", `${locale}/${slug}`)) ??
    (await getEntry("docs", `${defaultLocale}/${slug}`))
  )
}

/**
 * Fetches all FAQ entries for the given locale, falling back to "en".
 * Results are sorted by the `order` frontmatter field.
 */
export async function getFaqs(pathOrLocale?: string) {
  const locale = pathOrLocale
    ? (getLocaleFromPath(pathOrLocale) ?? defaultLocale)
    : defaultLocale
  const all = await getCollection("faqs")
  const locale_faqs = all.filter((e) => e.id.startsWith(`${locale}/`))
  const entries =
    locale_faqs.length > 0
      ? locale_faqs
      : all.filter((e) => e.id.startsWith(`${defaultLocale}/`))
  return entries.toSorted((a, b) => a.data.order - b.data.order)
}

/**
 * Fetches all published changelog entries for the given locale, falling
 * back to "en". Results are sorted by semantic version, newest first.
 */
export async function getChangelogs(pathOrLocale?: string) {
  const locale = pathOrLocale
    ? (getLocaleFromPath(pathOrLocale) ?? defaultLocale)
    : defaultLocale
  const all = await getCollection("changelogs")
  const locale_changelogs = all.filter(
    (e) => e.id.startsWith(`${locale}/`) && e.data.isPublished
  )
  const entries =
    locale_changelogs.length > 0
      ? locale_changelogs
      : all.filter(
          (e) => e.id.startsWith(`${defaultLocale}/`) && e.data.isPublished
        )
  return entries.toSorted((a, b) => {
    const d = b.data.versionMajor - a.data.versionMajor
    if (d !== 0) {
      return d
    }
    const d2 = b.data.versionMinor - a.data.versionMinor
    if (d2 !== 0) {
      return d2
    }
    return b.data.versionPatch - a.data.versionPatch
  })
}
