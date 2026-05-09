import { createFileRoute } from "@tanstack/react-router";

import { createAuthorsIndexOgImageResponse } from "@/lib/og-image.server";

export const Route = createFileRoute("/api/og/authors/png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";
        return await createAuthorsIndexOgImageResponse({ requestUrl: request.url, twitter });
      },
    },
  },
});
