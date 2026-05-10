import { createServerORPCClient } from "@/lib/orpc.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

export const getCategoryTopSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const result = await client.categories.getBySlug({ slug: data.slug });
    return result
      ? {
          count: result.count,
          topSkills: result.topSkills.map((skill) => ({
            id: skill.id,
            title: skill.title,
            description: skill.description,
            slug: skill.slug,
            authorHandle: skill.authorHandle,
            repoName: skill.repoName,
          })),
        }
      : null;
  });
