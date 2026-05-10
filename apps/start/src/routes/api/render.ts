import { renderContentAsync } from "@/lib/markdown";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

const schema = z.object({
  content: z.string(),
  path: z.string().nullish(),
  isMarkdown: z.boolean().nullish(),
  theme: z.enum(["dark", "light"]).nullish(),
});

export const Route = createFileRoute("/api/render")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: z.treeifyError(parsed.error) }, { status: 422 });
        }

        const html = await renderContentAsync(parsed.data);
        return Response.json({ html });
      },
    },
  },
});
