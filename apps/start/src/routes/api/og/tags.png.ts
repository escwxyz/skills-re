import { createFileRoute } from "@tanstack/react-router";

import { createTagsIndexOgImageResponse } from "@/lib/og-image.server";

export const Route = createFileRoute("/api/og/tags/png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";
        return await createTagsIndexOgImageResponse({ requestUrl: request.url, twitter });
      },
    },
  },
});
