import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { baseLocale } from "@/paraglide/runtime";
import { renderUrlEntry, resolveUrl, wrapUrlSet, XML_RESPONSE_HEADERS } from "@/lib/sitemap";

const STATIC_URLS = [
  { path: "/",           priority: "1.0", changefreq: "daily"   },
  { path: "/skills",     priority: "0.9", changefreq: "daily"   },
  { path: "/categories", priority: "0.8", changefreq: "weekly"  },
  { path: "/authors",    priority: "0.8", changefreq: "weekly"  },
  { path: "/collections",priority: "0.8", changefreq: "weekly"  },
  { path: "/docs",       priority: "0.7", changefreq: "monthly" },
  { path: "/changelogs", priority: "0.6", changefreq: "monthly" },
  { path: "/faq",        priority: "0.6", changefreq: "monthly" },
  { path: "/submit",     priority: "0.7", changefreq: "weekly"  },
  { path: "/search",     priority: "0.6", changefreq: "weekly"  },
  { path: "/terms",      priority: "0.5", changefreq: "yearly"  },
  { path: "/privacy",    priority: "0.5", changefreq: "yearly"  },
  { path: "/cookies",    priority: "0.5", changefreq: "yearly"  },
  { path: "/imprint",    priority: "0.5", changefreq: "yearly"  },
];

export const GET: APIRoute = async () => {
  // Derive /docs/[slug] URLs from the English content collection entries.
  const allDocs = await getCollection("docs");
  const docEntries = allDocs
    .filter((e) => e.id.startsWith(`${baseLocale}/`))
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      path: `/docs/${e.id.split("/")[1]}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: e.data.updatedAt?.toISOString().slice(0, 10),
    }));

  const entries = [
    ...STATIC_URLS.map((u) =>
      renderUrlEntry({ loc: resolveUrl(u.path), priority: u.priority, changefreq: u.changefreq }),
    ),
    ...docEntries.map((u) =>
      renderUrlEntry({
        loc: resolveUrl(u.path),
        priority: u.priority,
        changefreq: u.changefreq,
        lastmod: u.lastmod,
      }),
    ),
  ];

  return new Response(wrapUrlSet(entries), { headers: XML_RESPONSE_HEADERS });
};
