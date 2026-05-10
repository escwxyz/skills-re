import { createServerORPCClient } from "@/lib/orpc.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

export const getHomePageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const client = createServerORPCClient();

    const [categories, featuredSkills] = await Promise.all([
      client.categories.list({ all: true, limit: 8 }),
      client.skills.search({
        limit: 5,
        sort: "downloads-all-time",
      }),
    ]);

    return { categories, featuredPicks: featuredSkills.page };
  });
