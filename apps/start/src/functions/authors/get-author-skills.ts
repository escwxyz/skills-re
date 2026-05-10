import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getAuthorSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ handle: z.string(), limit: z.int().nonnegative().default(5) }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const result = await client.skills.search({
      authorHandle: data.handle,
      limit: data.limit,
      sort: "downloads-all-time",
    });
    return result.page;
  });
