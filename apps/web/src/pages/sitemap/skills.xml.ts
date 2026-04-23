import type { APIRoute } from "astro";
import { createServerClient } from "@/lib/server-orpc";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async ({ request }) => {
  const client = createServerClient(request);
  const skills = [];
  let cursor: string | undefined;
  let isDone = false;

  while (!isDone) {
    const page = await client.skills.list({
      cursor,
      limit: 100,
    });
    skills.push(...page.page);
    cursor = page.continueCursor || undefined;
    ({ isDone } = page);
  }

  const entries = skills.map((skill) =>
    renderUrlEntry({
      loc: resolveUrl(`/skills/${skill.slug}`),
      lastmod: new Date(skill.syncTime).toISOString(),
      changefreq: "weekly",
      priority: "0.8",
    }),
  );

  return new Response(wrapUrlSet(entries), { headers: XML_RESPONSE_HEADERS });
};
