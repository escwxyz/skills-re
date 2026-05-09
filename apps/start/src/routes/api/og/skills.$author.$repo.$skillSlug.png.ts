import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { createSkillOgImageResponse } from "@/lib/og-image.server";

const paramsSchema = z.object({
  author: z.string().min(1),
  repo: z.string().min(1),
  skillSlug: z.string().min(1),
});

export const Route = createFileRoute("/api/og/skills/$author/$repo/$skillSlug/png")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { author, repo, skillSlug } = paramsSchema.parse(params);
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";

        return await createSkillOgImageResponse({
          author,
          repo,
          requestUrl: request.url,
          skillSlug,
          twitter,
        });
      },
    },
  },
});
