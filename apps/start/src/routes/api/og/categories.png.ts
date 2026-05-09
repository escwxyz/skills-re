import { createFileRoute } from "@tanstack/react-router";

import { createCategoriesIndexOgImageResponse } from "@/lib/og-image.server";

export const Route = createFileRoute("/api/og/categories/png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";
        return await createCategoriesIndexOgImageResponse({ requestUrl: request.url, twitter });
      },
    },
  },
});
