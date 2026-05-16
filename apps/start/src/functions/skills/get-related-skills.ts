import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getRelatedSkills = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      category: z.string().optional(),
      excludeId: z.string().optional(),
      tags: z.array(z.string().trim().min(1)).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const hasTags = (data.tags?.length ?? 0) > 0;

    const result = await client.skills.search({
      categories: !hasTags && data.category ? [data.category] : undefined,
      limit: 6,
      tags: hasTags ? data.tags : undefined,
    });

    const filtered = data.excludeId
      ? result.page.filter((s) => s.id !== data.excludeId)
      : result.page;

    return filtered.slice(0, 4);
  });
