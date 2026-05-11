import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { locales } from "@/paraglide/runtime";
import { buildAuthorsListPageData } from "@/utils/author-list-data";
import { createServerORPCClient } from "@/lib/orpc.server";

// todo: pagination
export const getAuthorsList = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales]) }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();

    const [authors, skillsCount] = await Promise.all([
      client.skills.listAuthors(),
      client.skills.count(),
    ]);

    return buildAuthorsListPageData({
      authors,
      dailyMetrics: await client.metrics.dailySkillsSnapshots({ limit: 7 }),
      locale: data.locale,
      skillsCount,
    });
  });
