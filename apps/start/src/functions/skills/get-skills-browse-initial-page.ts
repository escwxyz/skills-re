import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { getBrowseSort } from "@/utils/browse";

import { fetchSkillsBrowseInitialPage } from "./skills.server";

export const getSkillsBrowseInitialPage = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      category: z.string().trim().optional(),
      q: z.string().trim().optional(),
      sort: z.string().trim().optional(),
      tag: z.array(z.string().trim().min(1)).optional(),
      tags: z.array(z.string().trim().min(1)).optional(),
    }),
  )
  .handler(({ data }) =>
    fetchSkillsBrowseInitialPage({
      category: data.category,
      client: createServerORPCClient(),
      q: data.q,
      sort: getBrowseSort(data.sort ?? null),
      tag: [...new Set([...(data.tag ?? []), ...(data.tags ?? [])])],
    }),
  );
