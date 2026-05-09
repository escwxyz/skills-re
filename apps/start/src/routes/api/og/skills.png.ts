import { createFileRoute } from "@tanstack/react-router";

import { createSkillsIndexOgImageResponse } from "@/lib/og-image.server";

export const Route = createFileRoute("/api/og/skills/png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";
        return await createSkillsIndexOgImageResponse({ requestUrl: request.url, twitter });
      },
    },
  },
});
