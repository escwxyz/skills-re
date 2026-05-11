import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagTopSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const tag = await client.tags.getBySlug({ slug: data.slug });

    if (!tag) {
      return null;
    }

    return {
      count: tag.count,
      topSkills: tag.topSkills.map((skill) => ({
        id: skill.id,
        title: skill.title,
        description: skill.description,
        slug: skill.slug,
        authorHandle: skill.authorHandle,
        repoName: skill.repoName,
      })),
    };
  });
