import type { APIRoute } from "astro";
import { CLASSIFICATIONS, COLLECTIONS } from "@/data/mock";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = () => {
  const categoryEntries = CLASSIFICATIONS.map((cls) =>
    renderUrlEntry({
      loc: resolveUrl(`/categories/${cls.id}`),
      changefreq: "weekly",
      priority: "0.7",
    }),
  );

  const collectionEntries = COLLECTIONS.map((col) =>
    renderUrlEntry({
      loc: resolveUrl(`/collections/${col.id}`),
      changefreq: "weekly",
      priority: "0.6",
    }),
  );

  return new Response(wrapUrlSet([...categoryEntries, ...collectionEntries]), {
    headers: XML_RESPONSE_HEADERS,
  });
};
