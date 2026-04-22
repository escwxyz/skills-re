import type { APIRoute } from "astro";
import { PUBLISHERS } from "@/data/mock";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = () => {
  const entries = PUBLISHERS.map((publisher) =>
    renderUrlEntry({
      loc: resolveUrl(`/authors/${publisher.handle}`),
      changefreq: "weekly",
      priority: "0.6",
    }),
  );

  return new Response(wrapUrlSet(entries), { headers: XML_RESPONSE_HEADERS });
};
