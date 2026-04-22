import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/constants";
import { wrapSitemapIndex, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = () => {
  const xml = wrapSitemapIndex([
    { loc: `${SITE_URL}/sitemap/static.xml` },
    { loc: `${SITE_URL}/sitemap/skills.xml` },
    { loc: `${SITE_URL}/sitemap/authors.xml` },
    { loc: `${SITE_URL}/sitemap/taxonomy.xml` },
  ]);

  return new Response(xml, { headers: XML_RESPONSE_HEADERS });
};
