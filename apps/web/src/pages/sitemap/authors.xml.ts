import type { APIRoute } from "astro";
import { createServerClient } from "@/lib/server-orpc";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async ({ request }) => {
  const client = createServerClient(request);
  const authors = await client.skills.listAuthors();

  const entries = authors.map((author) =>
    renderUrlEntry({
      loc: resolveUrl(`/authors/${author.handle}`),
      changefreq: "weekly",
      priority: "0.6",
    }),
  );

  return new Response(wrapUrlSet(entries), { headers: XML_RESPONSE_HEADERS });
};
