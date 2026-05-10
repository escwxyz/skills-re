import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillBasePageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();

    const path = await client.skills.resolvePathBySlug({ slug: data.slug });

    if (!path?.authorHandle) {
      return null;
    }

    const skill = await client.skills.getByPath({
      authorHandle: path.authorHandle,
      repoName: path.repoName,
      skillSlug: path.skillSlug,
    });

    if (!skill) {
      return null;
    }

    return {
      skill: {
        ...skill,
        authorHandle: path.authorHandle,
      },
    };
  });
