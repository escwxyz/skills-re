import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { createCategoryOgImageResponse } from "@/lib/og-image.server";

const paramsSchema = z.object({
  slug: z.string().min(1),
});

export const Route = createFileRoute("/api/og/categories/$slug/png")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { slug } = paramsSchema.parse(params);
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";

        return await createCategoryOgImageResponse({ slug, requestUrl: request.url, twitter });
      },
    },
  },
});
