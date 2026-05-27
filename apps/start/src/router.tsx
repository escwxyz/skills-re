import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { deLocalizeUrl, localizeUrl } from "./paraglide/runtime";
import { orpc, queryClient } from "@/lib/orpc";
import { ErrorComponent } from "./components/error-component";
import { NotFound } from "./components/not-found";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: { orpc, queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // https://inlang.com/m/gerre34r/library-inlang-paraglideJs/tanstack-start#rewrite-url
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    defaultErrorComponent: ErrorComponent,
    defaultNotFoundComponent: NotFound,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
