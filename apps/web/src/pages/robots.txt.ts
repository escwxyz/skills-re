import type { APIRoute } from "astro";
import { baseLocale as defaultLocale, locales } from "@/paraglide/runtime";

const getAllMultilingualUrls = (urls: string[]) =>
  locales.flatMap((locale) =>
    urls.map((url) => (locale === defaultLocale ? url : `/${locale}${url}`)),
  );

const disallowedPaths = getAllMultilingualUrls(["/dashboard", "/api"]);

export const GET: APIRoute = ({ site }) => {
  const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    ...disallowedPaths.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${new URL("/sitemap.xml", site).href}`,
  ].join("\n");

  return new Response(robotsTxt, {
    headers: { "Content-Type": "text/plain" },
  });
};
