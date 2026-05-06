import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";

const I18N_MIDDLEWARE_BYPASS_PATTERNS = [
  /^\/api(?:\/|$)/,
  /^\/dashboard(?:\/|$)/,
  /^\/sitemap\.xml$/,
  /^\/sitemap\.static\.xml$/,
  /^\/sitemap\.authors\.xml$/,
  /^\/sitemap\.taxonomy\.xml$/,
  /^\/sitemap\/skills\/[^/]+$/,
  /^\/robots\.txt$/,
  /^\/site\.webmanifest$/,
  /^\/favicon(?:-\d+x\d+)?\.(?:ico|png|svg)$/,
  /^\/apple-touch-icon\.png$/,
  /^\/web-app-manifest-\d+x\d+\.png$/,
];

const shouldBypassI18nMiddleware = (pathname: string) =>
  I18N_MIDDLEWARE_BYPASS_PATTERNS.some((pattern) => pattern.test(pathname));

export interface MyRequestContext {
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: MyRequestContext;
    };
  }
}

const serverEntry = createServerEntry({
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const createResponse = () => handler.fetch(request);

    return shouldBypassI18nMiddleware(pathname)
      ? await createResponse()
      : await paraglideMiddleware(request, createResponse);
  },
});

export default {
  fetch: serverEntry.fetch,
};
