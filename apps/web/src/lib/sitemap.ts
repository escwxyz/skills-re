import { SITE_URL } from "@/lib/constants";

export const resolveUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

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
    .map((s) =>
      [
        "  <sitemap>",
        `    <loc>${escapeXml(s.loc)}</loc>`,
        s.lastmod ? `    <lastmod>${s.lastmod}</lastmod>` : null,
        "  </sitemap>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
};

export const XML_RESPONSE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;
