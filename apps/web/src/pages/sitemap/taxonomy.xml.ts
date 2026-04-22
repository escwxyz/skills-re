import type { APIRoute } from "astro";
import { createServerClient } from "@/lib/server-orpc";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async ({ request }) => {
  const client = createServerClient(request);
  const categories = await client.categories.list({ all: true, limit: 100 });

  const categoryEntries = categories.map((category) =>
    renderUrlEntry({
      loc: resolveUrl(`/categories/${category.slug}`),
      changefreq: "weekly",
      priority: "0.7",
    }),
  );

  return new Response(wrapUrlSet(categoryEntries), {
    headers: XML_RESPONSE_HEADERS,
  });
};
