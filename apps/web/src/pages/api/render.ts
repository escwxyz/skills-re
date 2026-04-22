import type { APIRoute } from "astro";
import { z } from "zod/v4";
import { renderContentAsync } from "@/lib/markdown";

const schema = z.object({
  content: z.string(),
  path: z.string().nullish(),
  isMarkdown: z.boolean().nullish(),
  theme: z.enum(["dark", "light"]).nullish(),
});

export const POST: APIRoute = async ({ request }) => {
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
};
