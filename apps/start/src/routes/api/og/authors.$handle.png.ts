import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { createAuthorOgImageResponse } from "@/lib/og-image.server";

const paramsSchema = z.object({
  handle: z.string().min(1),
});

export const Route = createFileRoute("/api/og/authors/$handle/png")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { handle } = paramsSchema.parse(params);
        const twitter = new URL(request.url).searchParams.get("twitter") === "1";

        return await createAuthorOgImageResponse({
          handle,
          requestUrl: request.url,
          twitter,
        });
      },
    },
  },
});
