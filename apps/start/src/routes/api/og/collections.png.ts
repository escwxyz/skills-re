import { createFileRoute } from "@tanstack/react-router";

import { createCollectionsIndexOgImageResponse } from "@/lib/og-image.server";

export const Route = createFileRoute("/api/og/collections/png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";
        return await createCollectionsIndexOgImageResponse({ requestUrl: request.url, twitter });
      },
    },
  },
});
