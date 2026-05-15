import { createServerORPCClient } from "@/lib/orpc.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod/v4";

export const getHomePageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    setResponseHeader(
      "Link",
      [
        '</.well-known/api-catalog>; rel="api-catalog"',
        '</.well-known/agent-configuration>; rel="agent-configuration"',
      ].join(", "),
    );

    const client = createServerORPCClient();

    const [categories, featuredSkills] = await Promise.all([
      client.categories.list({ all: false, limit: 8 }),
      client.skills.search({
        limit: 5,
        sort: "downloads-all-time",
      }),
    ]);

    return { categories, featuredPicks: featuredSkills.page };
  });
