import { baseLocale, locales } from "@/paraglide/runtime";

import { SITE_URL } from "./constants";

const SITEMAP_SKILLS_PAGE_PATTERN = /^(\d+)(?:\.xml)?$/;

export const SITEMAP_SKILLS_PAGE_SIZE = 5000;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

export const resolveUrl = (path: string) => `${SITE_URL}${normalizePath(path)}`;

export const buildSitemapSkillsPagePath = (page: number) => `/sitemap/skills/${page}.xml`;

export const buildSitemapSkillsPageUrl = (page: number) =>
  `${SITE_URL}${buildSitemapSkillsPagePath(page)}`;

export const parseSitemapSkillsPageParam = (value: string) => {
  const normalized = value.trim();
  const match = SITEMAP_SKILLS_PAGE_PATTERN.exec(normalized);

  if (!match || match[1] !== normalized) {
    return null;
  }

  const page = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(page) && page > 0 ? page : null;
};

export const renderUrlEntry = ({
  loc,
  lastmod,
  changefreq,
  priority,
}: {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}) =>
  [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

export const wrapUrlSet = (entries: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

export const wrapSitemapIndex = (sitemaps: { loc: string; lastmod?: string }[]) => {
  const items = sitemaps
    .map((sitemap) =>
      [
        "  <sitemap>",
        `    <loc>${escapeXml(sitemap.loc)}</loc>`,
        sitemap.lastmod ? `    <lastmod>${sitemap.lastmod}</lastmod>` : null,
        "  </sitemap>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
};

export const XML_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "application/xml; charset=utf-8",
} as const;

export const getAllMultilingualUrls = (urls: string[]) =>
  locales.flatMap((locale) =>
    urls.map((url) => (locale === baseLocale ? url : `/${locale}${url}`)),
  );
