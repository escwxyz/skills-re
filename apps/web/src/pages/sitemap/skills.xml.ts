import type { APIRoute } from "astro";
import { SKILLS } from "@/data/mock";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = () => {
  const entries = SKILLS.map((skill) =>
    renderUrlEntry({
      loc: resolveUrl(`/skills/${skill.slug}`),
      lastmod: skill.publishedAt,
      changefreq: "weekly",
      priority: "0.8",
    }),
  );

  return new Response(wrapUrlSet(entries), { headers: XML_RESPONSE_HEADERS });
};
